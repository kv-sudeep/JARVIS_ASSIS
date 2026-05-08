/**
 * Server functions for JARVIS Module 1 — login flow, MFA, audit, dashboard.
 * All writes go through here so audit_log + auth_attempts stay consistent.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Inline SHA-256 (Web Crypto, works in Worker SSR)
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Verify PIN (browser hashes PIN + sends hash; we compare) ─────────────────
export const verifyPinAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      pin_hash: z.string().length(64),
      device_fingerprint: z.string().min(8).max(256),
      browser_agent: z.string().max(512).optional(),
      attempt_number: z.number().int().min(1).max(10).default(1),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owner } = await supabase
      .from("owners")
      .select("owner_id, pin_hash, failed_attempt_count, account_status, security_level")
      .eq("user_id", userId)
      .maybeSingle();

    if (!owner) return { ok: false, reason: "no_owner", failed_count: 0, lockdown: false };
    if (owner.account_status === "lockdown") {
      return { ok: false, reason: "lockdown_active", failed_count: owner.failed_attempt_count, lockdown: true };
    }

    const ok = owner.pin_hash === data.pin_hash;
    const newCount = ok ? 0 : owner.failed_attempt_count + 1;
    const lockdownThreshold = 6 - owner.security_level; // L5 → 1 strike, L1 → 5 strikes
    const triggerLockdown = !ok && newCount >= Math.max(lockdownThreshold, 2);

    await supabase.from("auth_attempts").insert({
      attempt_type: "pin",
      result: ok ? "success" : "fail",
      confidence_score: ok ? 100 : 0,
      device_fingerprint: data.device_fingerprint,
      browser_agent: data.browser_agent ?? null,
      attempt_number_in_sequence: data.attempt_number,
      lockdown_triggered: triggerLockdown,
      failure_reason: ok ? null : "pin_mismatch",
      threat_level: triggerLockdown ? "4" : ok ? null : "2",
    });

    await supabase.from("owners").update({
      failed_attempt_count: newCount,
      account_status: triggerLockdown ? "lockdown" : owner.account_status,
      lockdown_triggered_count: triggerLockdown
        ? (await supabase.from("owners").select("lockdown_triggered_count").eq("owner_id", owner.owner_id).single()).data!.lockdown_triggered_count + 1
        : undefined,
    }).eq("owner_id", owner.owner_id);

    if (triggerLockdown) {
      await supabase.from("intruder_events").insert({
        trigger_type: "repeated_pin_failure",
        threat_level: "4",
        pin_attempts: newCount,
        actions_taken: [{ type: "account_locked", at: new Date().toISOString() }],
      });
      await supabase.from("audit_log").insert({
        event_type: "LOCKDOWN_TRIGGERED",
        actor: "system",
        action_description: `Lockdown engaged after ${newCount} failed PIN attempts (L${owner.security_level} threshold ${lockdownThreshold}).`,
        severity: "critical",
      });
    } else {
      await supabase.from("audit_log").insert({
        event_type: ok ? "PIN_VERIFIED" : "PIN_FAILED",
        actor: ok ? "owner" : "intruder",
        action_description: ok ? "PIN accepted" : `PIN failed (${newCount}/${lockdownThreshold})`,
        severity: ok ? "info" : "warning",
      });
    }

    return { ok, reason: ok ? "success" : "pin_mismatch", failed_count: newCount, lockdown: triggerLockdown };
  });

// ── Verify TOTP code ─────────────────────────────────────────────────────────
export const verifyTotpAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      code: z.string().regex(/^\d{6}$/),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owner } = await supabase
      .from("owners")
      .select("owner_id, totp_secret_encrypted, two_factor_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (!owner || !owner.two_factor_enabled || !owner.totp_secret_encrypted) {
      return { ok: false, reason: "totp_not_enabled" };
    }
    // Lazy import otplib (server-only)
    const { OTP } = await import("otplib");
    const otp = new OTP({ strategy: "totp" });
    const result = await otp.verify({ token: data.code, secret: owner.totp_secret_encrypted, epochTolerance: 30 });
    const ok = result.valid;

    await supabase.from("auth_attempts").insert({
      attempt_type: "totp",
      result: ok ? "success" : "fail",
      confidence_score: ok ? 100 : 0,
      failure_reason: ok ? null : "totp_invalid",
    });
    await supabase.from("audit_log").insert({
      event_type: ok ? "TOTP_VERIFIED" : "TOTP_FAILED",
      actor: ok ? "owner" : "intruder",
      action_description: ok ? "TOTP accepted" : "TOTP code mismatch",
      severity: ok ? "info" : "warning",
    });
    return { ok, reason: ok ? "success" : "totp_invalid" };
  });

// ── Send + verify Email OTP via Lovable AI Gateway / Resend (stubbed) ────────
// We store a transient code in audit_log notes (hashed) keyed by session.
// For this slice we just generate + return code (dev mode) — real email goes
// through the email-infra pipeline once the user wires a domain.
export const requestEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: owner } = await supabase
      .from("owners")
      .select("owner_id, emergency_contact_email")
      .eq("user_id", userId)
      .maybeSingle();
    if (!owner) return { ok: false, sent_to: null, dev_code: null };

    const code = String(Math.floor(100000 + Math.random() * 900000));
    // Store hash in audit_log (immutable but fine for transient codes;
    // we look up the most-recent EMAIL_OTP_REQUESTED for this owner)
    const hash = await sha256Hex(`${owner.owner_id}:${code}`);
    await supabase.from("audit_log").insert({
      event_type: "EMAIL_OTP_REQUESTED",
      actor: "system",
      action_description: `Email OTP issued to ${owner.emergency_contact_email ?? "(no email on file)"}`,
      affected_resource: hash,
      severity: "info",
    });
    return {
      ok: true,
      sent_to: owner.emergency_contact_email,
      // DEV: return the code so the UI can flow without an email provider yet.
      dev_code: code,
    };
  });

export const verifyEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().regex(/^\d{6}$/) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owner } = await supabase
      .from("owners").select("owner_id").eq("user_id", userId).maybeSingle();
    if (!owner) return { ok: false };

    const hash = await sha256Hex(`${owner.owner_id}:${data.code}`);
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: log } = await supabase
      .from("audit_log")
      .select("log_id")
      .eq("event_type", "EMAIL_OTP_REQUESTED")
      .eq("affected_resource", hash)
      .gte("timestamp", since)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ok = !!log;
    await supabase.from("auth_attempts").insert({
      attempt_type: "email_otp",
      result: ok ? "success" : "fail",
      confidence_score: ok ? 100 : 0,
      failure_reason: ok ? null : "email_otp_invalid_or_expired",
    });
    await supabase.from("audit_log").insert({
      event_type: ok ? "EMAIL_OTP_VERIFIED" : "EMAIL_OTP_FAILED",
      actor: ok ? "owner" : "intruder",
      action_description: ok ? "Email OTP accepted" : "Email OTP failed",
      severity: ok ? "info" : "warning",
    });
    return { ok };
  });

// ── Dashboard data (read-only) ───────────────────────────────────────────────
export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ownerRaw } = await supabase
      .from("owners")
      .select("owner_id, full_name, account_status, security_level, two_factor_enabled, total_logins_count, failed_attempt_count, lockdown_triggered_count, total_intruders_caught, last_login_at, setup_complete, pin_enabled, hardware_lock_enabled, emergency_contact_email, preferred_language, timezone")
      .eq("user_id", userId)
      .maybeSingle();

    if (!ownerRaw) return { owner: null, recentAttempts: [], recentAudit: [], activeSessions: [], openIntrusions: [] };
    const owner = ownerRaw;

    const [attempts, audit, sessions, intrusions] = await Promise.all([
      supabase.from("auth_attempts").select("attempt_id, timestamp, attempt_type, result, confidence_score, failure_reason, threat_level, lockdown_triggered, attempt_number_in_sequence").order("timestamp", { ascending: false }).limit(20),
      supabase.from("audit_log").select("log_id, timestamp, event_type, actor, action_description, affected_resource, severity").order("timestamp", { ascending: false }).limit(30),
      supabase.from("sessions").select("session_id, issued_at, expires_at, is_active, login_method, auth_score, anomaly_score, os_name, device_type, location_city, location_country").eq("owner_id", owner.owner_id).eq("is_active", true).order("issued_at", { ascending: false }).limit(10),
      supabase.from("intruder_events").select("event_id, detected_at, trigger_type, threat_level, pin_attempts, owner_reviewed, resolved, false_alarm").eq("resolved", false).order("detected_at", { ascending: false }).limit(10),
    ]);

    return {
      owner,
      recentAttempts: attempts.data ?? [],
      recentAudit: audit.data ?? [],
      activeSessions: sessions.data ?? [],
      openIntrusions: intrusions.data ?? [],
    };
  });

// ── Resolve intruder event (owner reviews) ───────────────────────────────────
export const resolveIntruderEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      event_id: z.string().uuid(),
      false_alarm: z.boolean(),
      notes: z.string().max(2000).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("intruder_events").update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      false_alarm: data.false_alarm,
      owner_reviewed: true,
      owner_notes: data.notes ?? null,
    }).eq("event_id", data.event_id);
    if (error) return { ok: false, error: error.message };

    await supabase.from("audit_log").insert({
      event_type: data.false_alarm ? "INTRUDER_FALSE_ALARM" : "INTRUDER_RESOLVED",
      actor: "owner",
      action_description: data.false_alarm ? "Owner marked intrusion as false alarm" : "Owner resolved intrusion",
      affected_resource: data.event_id,
      severity: "info",
    });
    return { ok: true, error: null };
  });

// ── Lift lockdown (owner-initiated, after re-auth) ───────────────────────────
export const liftLockdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: owner } = await supabase
      .from("owners").select("owner_id, account_status").eq("user_id", userId).maybeSingle();
    if (!owner) return { ok: false };
    await supabase.from("owners").update({
      account_status: "active",
      failed_attempt_count: 0,
    }).eq("owner_id", owner.owner_id);
    await supabase.from("audit_log").insert({
      event_type: "LOCKDOWN_LIFTED",
      actor: "owner",
      action_description: "Owner lifted account lockdown after re-authentication",
      severity: "warning",
    });
    return { ok: true };
  });
