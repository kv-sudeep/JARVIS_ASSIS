/**
 * AuthScreen.tsx — JARVIS MODULE 1
 * Full-screen authentication gate: handles both Setup mode and Login mode.
 * Matches the existing JARVIS HUD aesthetic (Orbitron font, hud-cyan palette).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  enrollVoice,
  fetchAuthStatus,
  login,
  runSetup,
  resetSetup,
  type AuthStatus,
  type LoginResponse,
} from "@/lib/auth_api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | "boot"          // Checking server status
  | "setup_pin"     // First-time: enter PIN
  | "setup_voice"   // First-time: record voice
  | "login_pin"     // Returning: enter PIN
  | "login_voice"   // Returning: speak passphrase
  | "locked"        // Lockdown state
  | "success";      // Authenticated

interface AuthScreenProps {
  onAuthenticated: (token: LoginResponse) => void;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;
const PIN_LENGTH   = 6;

function PinDots({ value, maxLen }: { value: string; maxLen: number }) {
  return (
    <div id="auth-pin-dots" className="flex gap-3 justify-center my-6">
      {Array.from({ length: maxLen }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
            i < value.length
              ? "bg-hud-cyan border-hud-cyan shadow-[0_0_12px_var(--hud-cyan)]"
              : "bg-transparent border-hud-cyan/40"
          }`}
        />
      ))}
    </div>
  );
}

function PinPad({ onDigit, onBackspace, onSubmit, disabled }: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const keys = ["1","2","3","4","5","6","7","8","9","←","0","↵"];
  return (
    <div id="auth-pinpad" className="grid grid-cols-3 gap-3 w-64 mx-auto">
      {keys.map((k) => (
        <button
          key={k}
          disabled={disabled}
          id={`auth-key-${k === "←" ? "back" : k === "↵" ? "enter" : k}`}
          onClick={() => {
            if (k === "←") onBackspace();
            else if (k === "↵") onSubmit();
            else onDigit(k);
          }}
          className={`
            h-14 font-display text-lg tracking-widest rounded
            border border-hud-cyan/30 backdrop-blur
            transition-all duration-150 select-none
            ${disabled
              ? "opacity-30 cursor-not-allowed text-hud-cyan/40"
              : "text-hud-cyan hover:bg-hud-cyan/10 hover:border-hud-cyan/70 hover:shadow-[0_0_16px_var(--hud-cyan)]  active:scale-95"
            }
            ${k === "↵" ? "bg-hud-cyan/15 border-hud-cyan/60" : ""}
          `}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ text, color }: { text: string; color: "cyan" | "green" | "red" | "orange" }) {
  const colors = {
    cyan:   "text-hud-cyan border-hud-cyan/50 shadow-[0_0_12px_var(--hud-cyan)]",
    green:  "text-hud-green border-hud-green/50 shadow-[0_0_12px_var(--hud-green)]",
    red:    "text-red-400 border-red-500/50 shadow-[0_0_12px_rgba(255,60,60,0.6)]",
    orange: "text-hud-orange border-hud-orange/50 shadow-[0_0_12px_var(--hud-orange)]",
  };
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded font-display text-[10px] tracking-[0.3em] ${colors[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
        color === "green" ? "bg-hud-green" :
        color === "red"   ? "bg-red-400"   :
        color === "orange"? "bg-hud-orange" : "bg-hud-cyan"
      }`} />
      {text}
    </div>
  );
}

// ── Waveform Animation for voice phases ───────────────────────────────────────
function LiveWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-1 h-10 my-4">
      {Array.from({ length: 28 }).map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-hud-cyan transition-all"
          style={{
            height: active
              ? `${8 + Math.abs(Math.sin(Date.now() / 300 + i * 0.6)) * 28}px`
              : "4px",
            opacity: active ? 0.85 : 0.25,
            animation: active ? `wave-bar ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` : "none",
          }}
        />
      ))}
    </div>
  );
}

// ── Lockdown Screen ────────────────────────────────────────────────────────────
function LockdownScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
      <div className="relative">
        <div className="w-32 h-32 rounded-full border-2 border-red-500 flex items-center justify-center shadow-[0_0_60px_rgba(255,60,60,0.5)]">
          <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
      </div>
      <div className="font-display text-3xl tracking-[0.4em] text-red-400 animate-flicker">
        LOCKDOWN
      </div>
      <div className="font-display text-xs tracking-[0.4em] text-red-400/70">
        INTRUDER PROTOCOL ACTIVATED
      </div>
      <div className="text-center text-[11px] tracking-[0.2em] text-muted-foreground max-w-xs leading-relaxed">
        3 FAILED ATTEMPTS DETECTED<br />
        WORKSTATION SECURING · ALERTS DISPATCHED<br />
        WEBCAM SNAPSHOT CAPTURED
      </div>
    </div>
  );
}

// ── Success Screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ similarity }: { similarity: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
      <div className="relative">
        <div className="w-32 h-32 rounded-full border-2 border-hud-green flex items-center justify-center shadow-[0_0_60px_var(--hud-green)]">
          <svg className="w-16 h-16 text-hud-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-hud-green/30 animate-ping" style={{ animationDuration: "1.5s" }} />
      </div>
      <div className="font-display text-2xl tracking-[0.4em] text-hud-green hud-text-glow animate-flicker">
        IDENTITY CONFIRMED
      </div>
      <div className="font-display text-xs tracking-[0.3em] text-hud-cyan/80">
        VOICE MATCH · {(similarity * 100).toFixed(1)}%
      </div>
      <div className="font-display text-sm tracking-[0.2em] text-foreground/90">
        WELCOME, SIR. JARVIS ONLINE.
      </div>
    </div>
  );
}

// ── Main Auth Screen ───────────────────────────────────────────────────────────

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [phase, setPhase]             = useState<Phase>("boot");
  const [pin, setPin]                 = useState("");
  const [confirmPin, setConfirmPin]   = useState("");
  const [setupStep, setSetupStep]     = useState<1 | 2>(1); // 1=enter, 2=confirm
  const [error, setError]             = useState<string | null>(null);
  const [info, setInfo]               = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [failedAttempts, setFailed]   = useState(0);
  const [voiceActive, setVoiceActive] = useState(false);
  const [similarity, setSimilarity]   = useState(0);
  const [status, setStatus]           = useState<AuthStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Boot: check server ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const s = await fetchAuthStatus();
        setStatus(s);
        setFailed(s.failed_attempts);
        setPhase(s.setup_complete ? "login_pin" : "setup_pin");
      } catch {
        setError("Cannot connect to JARVIS backend. Is the Flask server running?");
        setPhase("login_pin"); // show UI anyway
      }
    })();
  }, []);

  // ── Animated waveform ticker ────────────────────────────────────────────
  useEffect(() => {
    if (voiceActive) {
      intervalRef.current = setInterval(() => {
        // Force re-render for wave animation
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [voiceActive]);

  // ── PIN Input handlers ──────────────────────────────────────────────────
  const addDigit = useCallback((d: string) => {
    if (pin.length < PIN_LENGTH) setPin(p => p + d);
    setError(null);
  }, [pin]);

  const addConfirmDigit = useCallback((d: string) => {
    if (confirmPin.length < PIN_LENGTH) setConfirmPin(p => p + d);
    setError(null);
  }, [confirmPin]);

  const backspace = useCallback(() => setPin(p => p.slice(0, -1)), []);
  const backspaceConfirm = useCallback(() => setConfirmPin(p => p.slice(0, -1)), []);

  // ── Keyboard support ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (loading || phase === "locked" || phase === "success" || phase === "boot") return;
      if (e.key >= "0" && e.key <= "9") {
        if (phase === "setup_pin" && setupStep === 2) addConfirmDigit(e.key);
        else addDigit(e.key);
      }
      if (e.key === "Backspace") {
        if (phase === "setup_pin" && setupStep === 2) backspaceConfirm();
        else backspace();
      }
      if (e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ── Setup Flow ──────────────────────────────────────────────────────────
  const handleSetupPinSubmit = async () => {
    setError(null);
    if (setupStep === 1) {
      if (pin.length < 4) { setError("PIN must be at least 4 digits."); return; }
      setSetupStep(2);
      return;
    }
    // Confirm step
    if (confirmPin !== pin) { setError("PINs do not match. Try again."); setPin(""); setConfirmPin(""); setSetupStep(1); return; }
    setLoading(true);
    try {
      await runSetup(pin);
      setInfo("Hardware fingerprint captured. Now enrolling voice...");
      setPhase("setup_voice");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceEnroll = async () => {
    setError(null);
    setVoiceActive(true);
    setInfo("Recording for 4 seconds — speak your passphrase now...");
    setLoading(true);
    try {
      await enrollVoice();
      setVoiceActive(false);
      setInfo("Voice enrolled! Setup complete.");
      setTimeout(() => setPhase("login_pin"), 1800);
    } catch (e) {
      setVoiceActive(false);
      setError(e instanceof Error ? e.message : "Voice enrollment failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Login Flow ──────────────────────────────────────────────────────────
  const handleLoginPin = async () => {
    setError(null);
    if (pin.length < 4) { setError("Enter your PIN."); return; }
    setLoading(true);
    // We do PIN + voice together in /login — so first move to voice phase
    setInfo("PIN accepted. Now verifying voice...");
    setPhase("login_voice");
    setLoading(false);
  };

  const handleLoginVoice = async () => {
    setError(null);
    setVoiceActive(true);
    setInfo("Recording voice for 4 seconds — speak your passphrase...");
    setLoading(true);
    try {
      const result = await login(pin);
      setVoiceActive(false);
      setSimilarity(result.voice_similarity);
      setPhase("success");
      setTimeout(() => onAuthenticated(result), 2200);
    } catch (e) {
      setVoiceActive(false);
      const msg = e instanceof Error ? e.message : "Login failed.";
      if (msg.includes("LOCKDOWN") || msg.includes("INTRUDER")) {
        setPhase("locked");
      } else {
        const newFailed = failedAttempts + 1;
        setFailed(newFailed);
        setError(msg);
        setPin("");
        setPhase("login_pin");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Unified submit dispatcher ────────────────────────────────────────────
  const handleSubmit = () => {
    if (loading) return;
    if (phase === "setup_pin") handleSetupPinSubmit();
    if (phase === "login_pin") handleLoginPin();
    if (phase === "login_voice") handleLoginVoice();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      id="auth-screen"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: "oklch(0.12 0.04 250)" }}
    >
      {/* Animated grid backdrop */}
      <div className="absolute inset-0 hud-grid-bg opacity-40 pointer-events-none" />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, oklch(0.65 0.22 240 / 0.12) 0%, transparent 70%)",
        }}
      />

      {/* Corner brackets */}
      {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-8 h-8 border-hud-cyan/50`}
          style={{
            borderTopWidth:    i < 2 ? "2px" : 0,
            borderBottomWidth: i >= 2 ? "2px" : 0,
            borderLeftWidth:   i % 2 === 0 ? "2px" : 0,
            borderRightWidth:  i % 2 === 1 ? "2px" : 0,
          }}
        />
      ))}

      {/* Top label */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 font-display text-[10px] tracking-[0.6em] text-hud-cyan/60 animate-flicker">
        STARK INDUSTRIES · JARVIS v2.0 · SECURE BOOT
      </div>

      {/* Failed attempts indicator */}
      {(phase === "login_pin" || phase === "login_voice") && failedAttempts > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2">
          <StatusBadge
            text={`${failedAttempts}/${MAX_ATTEMPTS} ATTEMPTS USED`}
            color="orange"
          />
        </div>
      )}

      {/* Central card */}
      <div
        id="auth-card"
        className="relative hud-panel rounded-lg p-10 w-full max-w-sm mx-4 flex flex-col items-center animate-rise"
      >
        {/* JARVIS logo / arc reactor */}
        <div className="relative mb-4">
          <div
            className="w-20 h-20 rounded-full border-2 border-hud-cyan flex items-center justify-center"
            style={{ boxShadow: "0 0 30px var(--hud-cyan), inset 0 0 20px oklch(0.65 0.22 240 / 0.2)" }}
          >
            <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
              <circle cx="24" cy="24" r="10" stroke="var(--hud-cyan)" strokeWidth="1.5" />
              <circle cx="24" cy="24" r="5"  fill="var(--hud-cyan)" opacity="0.8" />
              {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <line
                  key={i}
                  x1="24" y1="14"
                  x2="24" y2="4"
                  stroke="var(--hud-cyan)"
                  strokeWidth="1"
                  opacity="0.6"
                  transform={`rotate(${deg} 24 24)`}
                />
              ))}
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full border border-hud-cyan/20 animate-spin-slow" />
        </div>

        <div className="font-display text-xl tracking-[0.4em] text-hud-cyan hud-text-glow mb-1">
          J.A.R.V.I.S
        </div>
        <div className="font-display text-[9px] tracking-[0.5em] text-muted-foreground mb-6">
          OWNER AUTHENTICATION REQUIRED
        </div>

        {/* ── Phase content ── */}

        {phase === "boot" && (
          <div className="flex flex-col items-center gap-3">
            <StatusBadge text="CONNECTING TO BACKEND..." color="cyan" />
          </div>
        )}

        {phase === "locked" && <LockdownScreen />}
        {phase === "success" && <SuccessScreen similarity={similarity} />}

        {phase === "setup_pin" && (
          <>
            <StatusBadge text={setupStep === 1 ? "FIRST RUN — SET YOUR PIN" : "CONFIRM YOUR PIN"} color="orange" />
            <PinDots value={setupStep === 1 ? pin : confirmPin} maxLen={PIN_LENGTH} />
            <PinPad
              onDigit={setupStep === 1 ? addDigit : addConfirmDigit}
              onBackspace={setupStep === 1 ? backspace : backspaceConfirm}
              onSubmit={handleSetupPinSubmit}
              disabled={loading}
            />
          </>
        )}

        {phase === "setup_voice" && (
          <>
            <StatusBadge text="ENROLL VOICE FINGERPRINT" color="cyan" />
            <LiveWaveform active={voiceActive} />
            <p className="font-display text-[10px] tracking-[0.25em] text-muted-foreground text-center mb-4 leading-relaxed">
              SPEAK YOUR PASSPHRASE WHEN READY.<br/>
              E.G. "JARVIS, ONLINE. STARK AUTHORIZED."
            </p>
            <button
              id="auth-voice-enroll-btn"
              onClick={handleVoiceEnroll}
              disabled={loading}
              className={`
                w-full py-3 font-display text-xs tracking-[0.4em] rounded
                border border-hud-cyan/50 text-hud-cyan
                transition-all duration-200
                ${loading
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-hud-cyan/10 hover:border-hud-cyan hover:shadow-[0_0_20px_var(--hud-cyan)]"
                }
              `}
            >
              {loading ? "RECORDING..." : "▶  START RECORDING"}
            </button>
          </>
        )}

        {phase === "login_pin" && (
          <>
            <StatusBadge text="ENTER PIN" color="cyan" />
            <PinDots value={pin} maxLen={PIN_LENGTH} />
            <PinPad onDigit={addDigit} onBackspace={backspace} onSubmit={handleLoginPin} disabled={loading} />
            <button
              id="auth-reset-btn"
              disabled={loading}
              onClick={async () => {
                if (confirm("Are you sure you want to factory reset JARVIS and register a new identity?")) {
                  setLoading(true);
                  try {
                    await resetSetup();
                    // Force reload to restart from scratch
                    window.location.reload();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Reset failed");
                    setLoading(false);
                  }
                }
              }}
              className="mt-6 font-display text-[9px] tracking-[0.2em] text-hud-cyan/40 hover:text-red-400 transition-colors"
            >
              [ REGISTER NEW IDENTITY ]
            </button>
          </>
        )}

        {phase === "login_voice" && (
          <>
            <StatusBadge text="VOICE VERIFICATION" color="cyan" />
            <LiveWaveform active={voiceActive} />
            <p className="font-display text-[10px] tracking-[0.25em] text-muted-foreground text-center mb-4 leading-relaxed">
              SPEAK YOUR PASSPHRASE NOW.<br/>
              HOLD STILL FOR 4 SECONDS.
            </p>
            <button
              id="auth-voice-verify-btn"
              onClick={handleLoginVoice}
              disabled={loading}
              className={`
                w-full py-3 font-display text-xs tracking-[0.4em] rounded
                border border-hud-cyan/50 text-hud-cyan
                transition-all duration-200
                ${loading
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-hud-cyan/10 hover:border-hud-cyan hover:shadow-[0_0_20px_var(--hud-cyan)]"
                }
              `}
            >
              {loading ? "ANALYZING..." : "▶  VERIFY VOICE"}
            </button>
          </>
        )}

        {/* Error / Info messages */}
        {error && (
          <div
            id="auth-error-msg"
            className="mt-4 font-display text-[10px] tracking-[0.3em] text-red-400 text-center animate-fade-in"
          >
            ⚠ {error}
          </div>
        )}
        {info && !error && (
          <div
            id="auth-info-msg"
            className="mt-4 font-display text-[10px] tracking-[0.3em] text-hud-green text-center animate-fade-in"
          >
            ✓ {info}
          </div>
        )}
      </div>

      {/* Bottom label */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-display text-[9px] tracking-[0.5em] text-hud-cyan/30 animate-flicker">
        ENCRYPTION · AES-256 · HARDWARE-LOCKED · JWT SESSION
      </div>

      {/* Wave bar animation keyframes */}
      <style>{`
        @keyframes wave-bar {
          0%   { height: 4px; }
          100% { height: 32px; }
        }
      `}</style>
    </div>
  );
}
