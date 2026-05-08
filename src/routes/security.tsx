/**
 * /security — JARVIS owner security dashboard.
 * Shows owner status, recent auth attempts, audit trail, active sessions, open intrusions.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HudShell, HudPanel, HudButton } from "@/components/jarvis/HudShell";
import { useJarvisSession } from "@/hooks/use-jarvis-session";
import { getDashboardData, resolveIntruderEvent, liftLockdown } from "@/lib/jarvis/auth.functions";

export const Route = createFileRoute("/security")({
  component: SecurityDashboard,
  head: () => ({
    meta: [
      { title: "JARVIS — Security Command" },
      { name: "description", content: "Owner security dashboard: sessions, audit log, intruder events." },
    ],
  }),
});

type DashData = Awaited<ReturnType<typeof getDashboardData>>;

function SecurityDashboard() {
  const { user, loading, signOut } = useJarvisSession();
  const navigate = useNavigate();
  const [data, setData] = useState<DashData | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const d = await getDashboardData();
    setData(d);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    refresh();
  }, [user, loading, navigate]);

  if (!data || !data.owner) {
    return (
      <HudShell label="◣ JARVIS · SECURITY COMMAND ◢">
        <main className="relative z-10 flex min-h-screen items-center justify-center">
          <HudPanel title="LOADING">
            <div className="text-hud-cyan/70 text-sm">Acquiring telemetry…</div>
          </HudPanel>
        </main>
      </HudShell>
    );
  }

  const { owner, recentAttempts, recentAudit, activeSessions, openIntrusions } = data;
  const isLocked = owner.account_status === "lockdown";

  return (
    <HudShell label="◣ JARVIS · SECURITY COMMAND ◢">
      <main className="relative z-10 px-6 py-16 max-w-7xl mx-auto space-y-4">
        {/* Top owner bar */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-2xl tracking-[0.3em] text-hud-cyan hud-text-glow">
              {owner.full_name}
            </div>
            <div className="font-display text-[10px] tracking-[0.4em] text-hud-cyan/60">
              SECURITY LEVEL · L{owner.security_level} ·{" "}
              <span className={isLocked ? "text-red-400" : "text-hud-green"}>
                {owner.account_status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/">
              <HudButton variant="ghost">‹ JARVIS HUD</HudButton>
            </Link>
            <HudButton variant="ghost" onClick={signOut}>SIGN OUT</HudButton>
          </div>
        </div>

        {isLocked && (
          <HudPanel title="LOCKDOWN ENGAGED" glow="red">
            <div className="flex items-center justify-between gap-4">
              <div className="text-red-400 text-sm tracking-wider">
                Account is locked. Lift only if intrusion was a false alarm.
              </div>
              <HudButton
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await liftLockdown();
                  await refresh();
                  setBusy(false);
                }}
              >
                LIFT LOCKDOWN
              </HudButton>
            </div>
          </HudPanel>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="TOTAL LOGINS" value={owner.total_logins_count} />
          <Stat label="FAILED ATTEMPTS" value={owner.failed_attempt_count} accent={owner.failed_attempt_count > 0 ? "orange" : "cyan"} />
          <Stat label="LOCKDOWNS" value={owner.lockdown_triggered_count} accent="red" />
          <Stat label="INTRUDERS CAUGHT" value={owner.total_intruders_caught} accent="red" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HudPanel title={`OPEN INTRUSIONS · ${openIntrusions.length}`} glow={openIntrusions.length > 0 ? "red" : "cyan"}>
            {openIntrusions.length === 0 ? (
              <div className="text-hud-cyan/50 text-xs tracking-wider py-3">No active threats.</div>
            ) : (
              <div className="space-y-2">
                {openIntrusions.map((ev) => (
                  <div key={ev.event_id} className="border border-red-500/30 rounded p-2 bg-red-500/5">
                    <div className="flex justify-between text-[10px] tracking-wider text-red-400">
                      <span>{ev.trigger_type.toUpperCase()} · L{ev.threat_level}</span>
                      <span>{new Date(ev.detected_at).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <HudButton variant="ghost" onClick={async () => { await resolveIntruderEvent({ data: { event_id: ev.event_id, false_alarm: true } }); refresh(); }}>FALSE ALARM</HudButton>
                      <HudButton variant="danger" onClick={async () => { await resolveIntruderEvent({ data: { event_id: ev.event_id, false_alarm: false } }); refresh(); }}>RESOLVE</HudButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </HudPanel>

          <HudPanel title={`ACTIVE SESSIONS · ${activeSessions.length}`}>
            {activeSessions.length === 0 ? (
              <div className="text-hud-cyan/50 text-xs tracking-wider py-3">No active sessions.</div>
            ) : (
              <div className="space-y-1.5 text-[11px] tracking-wider">
                {activeSessions.map((s) => (
                  <div key={s.session_id} className="flex justify-between border-b border-hud-cyan/10 pb-1">
                    <span className="text-hud-cyan">{s.os_name} · {s.device_type ?? "?"}</span>
                    <span className="text-hud-cyan/50">{s.login_method} · score {s.auth_score}</span>
                  </div>
                ))}
              </div>
            )}
          </HudPanel>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HudPanel title="RECENT AUTH ATTEMPTS">
            <div className="space-y-1 text-[11px] tracking-wider max-h-72 overflow-y-auto">
              {recentAttempts.length === 0 && <div className="text-hud-cyan/40">No attempts logged.</div>}
              {recentAttempts.map((a) => (
                <div key={a.attempt_id} className="flex justify-between border-b border-hud-cyan/10 pb-1">
                  <span className={a.result === "success" ? "text-hud-green" : a.result === "fail" ? "text-red-400" : "text-hud-orange"}>
                    {a.attempt_type} · {a.result}
                  </span>
                  <span className="text-hud-cyan/50">{new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </HudPanel>

          <HudPanel title="AUDIT TRAIL">
            <div className="space-y-1 text-[11px] tracking-wider max-h-72 overflow-y-auto">
              {recentAudit.length === 0 && <div className="text-hud-cyan/40">No events logged.</div>}
              {recentAudit.map((a) => (
                <div key={a.log_id} className="border-b border-hud-cyan/10 pb-1">
                  <div className="flex justify-between">
                    <span className={a.severity === "critical" ? "text-red-400" : a.severity === "warning" ? "text-hud-orange" : "text-hud-cyan"}>
                      {a.event_type}
                    </span>
                    <span className="text-hud-cyan/50">{new Date(a.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-hud-cyan/60 text-[10px]">{a.action_description}</div>
                </div>
              ))}
            </div>
          </HudPanel>
        </div>
      </main>
    </HudShell>
  );
}

function Stat({ label, value, accent = "cyan" }: { label: string; value: number; accent?: "cyan" | "orange" | "red" }) {
  const c = accent === "red" ? "text-red-400" : accent === "orange" ? "text-hud-orange" : "text-hud-cyan";
  return (
    <HudPanel>
      <div className="text-[9px] tracking-[0.4em] text-hud-cyan/50">{label}</div>
      <div className={`font-display text-3xl ${c} hud-text-glow mt-1`}>{value}</div>
    </HudPanel>
  );
}
