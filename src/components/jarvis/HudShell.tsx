/**
 * Reusable JARVIS HUD shell elements for non-home routes (auth, dashboard).
 * Re-uses the same Orbitron / hud-cyan tokens already in src/styles.css.
 */
import React from "react";
import { Background } from "./Background";

export function HudShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Share+Tech+Mono&display=swap"
      />
      <Background />
      <div className="relative min-h-screen w-full overflow-x-hidden">
        {/* Corner brackets */}
        {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos, i) => (
          <div
            key={i}
            className={`fixed ${pos} w-6 h-6 border-hud-cyan/50 pointer-events-none z-30`}
            style={{
              borderTopWidth: i < 2 ? "2px" : 0,
              borderBottomWidth: i >= 2 ? "2px" : 0,
              borderLeftWidth: i % 2 === 0 ? "2px" : 0,
              borderRightWidth: i % 2 === 1 ? "2px" : 0,
            }}
          />
        ))}
        <header className="fixed top-3 left-1/2 -translate-x-1/2 font-display text-[10px] tracking-[0.5em] text-hud-cyan/70 animate-flicker z-30">
          {label}
        </header>
        {children}
      </div>
    </>
  );
}

export function HudPanel({
  title,
  children,
  className = "",
  glow = "cyan",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  glow?: "cyan" | "green" | "orange" | "red";
}) {
  const glowMap = {
    cyan: "border-hud-cyan/40",
    green: "border-hud-green/50",
    orange: "border-hud-orange/50",
    red: "border-red-500/50",
  };
  return (
    <div className={`relative hud-panel rounded-lg p-4 ${glowMap[glow]} ${className}`}>
      {title && (
        <div className="font-display text-[10px] tracking-[0.4em] text-hud-cyan/80 mb-3 border-b border-hud-cyan/20 pb-1">
          ◆ {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function HudButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary:
      "border-hud-cyan/60 text-hud-cyan hover:bg-hud-cyan/15 hover:shadow-[0_0_18px_var(--hud-cyan)]",
    ghost: "border-hud-cyan/20 text-hud-cyan/70 hover:bg-hud-cyan/5",
    danger: "border-red-500/60 text-red-400 hover:bg-red-500/15 hover:shadow-[0_0_18px_rgba(255,60,60,0.6)]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-display text-xs tracking-[0.3em] px-5 py-2.5 border rounded backdrop-blur
        transition-all duration-150 select-none
        ${disabled ? "opacity-30 cursor-not-allowed" : "active:scale-95"}
        ${styles[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export function HudInput({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  autoFocus,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autoFocus={autoFocus}
      className={`
        w-full bg-transparent border border-hud-cyan/30 rounded px-3 py-2
        font-display text-sm tracking-widest text-hud-cyan
        placeholder:text-hud-cyan/30 placeholder:tracking-[0.2em]
        focus:border-hud-cyan focus:outline-none focus:shadow-[0_0_15px_var(--hud-cyan)]
        transition-all
        ${className}
      `}
    />
  );
}
