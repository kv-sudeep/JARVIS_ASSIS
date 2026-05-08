/**
 * Server functions for JARVIS Module 1 — owner setup, status, audit writes.
 * Browser code should NOT call Supabase directly for owner mutations —
 * route through these so the audit log entries are guaranteed.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SetupOwnerSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  security_level: z.number().int().min(1).max(5),
  preferred_language: z.string().trim().min(2).max(8).default("en"),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
  emergency_contact_email: z.string().email().max(255).nullable().optional(),
  emergency_contact_phone: z.string().trim().max(32).nullable().optional(),
  pin_hash: z.string().length(64),
  pin_salt: z.string().min(8).max(128),
  hardware_fingerprint_hash: z.string().min(16).max(256),
  totp_secret_encrypted: z.string().nullable().optional(),
  two_factor_enabled: z.boolean().default(false),
  backup_passphrase_hash: z.string().min(16).max(256).nullable().optional(),
  security_questions_hash: z.array(z.string()).max(10).nullable().optional(),
});

export const setupOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetupOwnerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check if owner already exists
    const { data: existing } = await supabase
      .from("owners")
      .select("owner_id")
      .maybeSingle();

    if (existing) {
      return { error: "Owner already exists. JARVIS is single-owner.", owner_id: null };
    }

    const { data: inserted, error } = await supabase
      .from("owners")
      .insert({
        user_id: userId,
        full_name: data.full_name,
        security_level: data.security_level,
        preferred_language: data.preferred_language,
        timezone: data.timezone,
        emergency_contact_email: data.emergency_contact_email ?? null,
        emergency_contact_phone: data.emergency_contact_phone ?? null,
        pin_hash: data.pin_hash,
        pin_salt: data.pin_salt,
        hardware_fingerprint_hash: data.hardware_fingerprint_hash,
        totp_secret_encrypted: data.totp_secret_encrypted ?? null,
        two_factor_enabled: data.two_factor_enabled,
        backup_passphrase_hash: data.backup_passphrase_hash ?? null,
        security_questions_hash: data.security_questions_hash ?? null,
        pin_enabled: true,
        setup_complete: true,
      })
      .select("owner_id")
      .single();

    if (error) {
      console.error("setupOwner failed:", error);
      return { error: error.message, owner_id: null };
    }

    // Write audit entry
    await supabase.from("audit_log").insert({
      event_type: "OWNER_SETUP_COMPLETE",
      actor: "owner",
      action_description: `Owner ${data.full_name} completed first-time setup at security level ${data.security_level}`,
      severity: "info",
      reversible: false,
    });

    return { error: null, owner_id: inserted.owner_id };
  });

export const getOwnerStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("owners")
      .select("owner_id, full_name, setup_complete, security_level, account_status, two_factor_enabled, total_logins_count, failed_attempt_count, lockdown_triggered_count, total_intruders_caught, last_login_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { owner: null, error: error.message };
    return { owner: data, error: null };
  });

export const recordLoginSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      browser_fingerprint: z.string().max(256),
      os_name: z.string().max(64),
      os_version: z.string().max(64),
      device_type: z.string().max(32),
      timezone: z.string().max(64),
      auth_score: z.number().int().min(0).max(100),
      login_method: z.enum(["pin","totp","email_otp","multi"]),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owner } = await supabase
      .from("owners").select("owner_id").eq("user_id", userId).maybeSingle();
    if (!owner) return { session_id: null, error: "Owner not found" };

    const expires = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const { data: sess, error } = await supabase.from("sessions").insert({
      owner_id: owner.owner_id,
      expires_at: expires,
      browser_fingerprint: data.browser_fingerprint,
      os_name: data.os_name,
      os_version: data.os_version,
      device_type: data.device_type,
      timezone: data.timezone,
      auth_score: data.auth_score,
      login_method: data.login_method,
    }).select("session_id").single();

    if (error) return { session_id: null, error: error.message };

    await supabase.from("owners")
      .update({ last_login_at: new Date().toISOString(), failed_attempt_count: 0 })
      .eq("owner_id", owner.owner_id);

    await supabase.from("audit_log").insert({
      event_type: "LOGIN_SUCCESS",
      actor: "owner",
      session_id: sess.session_id,
      action_description: `Login via ${data.login_method} (score ${data.auth_score})`,
      severity: "info",
    });

    return { session_id: sess.session_id, error: null };
  });
