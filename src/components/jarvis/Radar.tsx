export function Radar() {
  return (
    <div className="relative h-24 w-24 rounded-full border border-hud-cyan/40"
      style={{ boxShadow: "inset 0 0 20px oklch(0.85 0.18 220 / 0.2)" }}>
      <div className="absolute inset-2 rounded-full border border-hud-cyan/30" />
      <div className="absolute inset-5 rounded-full border border-hud-cyan/30" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-hud-cyan/20" />
      <div className="absolute top-1/2 left-0 h-px w-full bg-hud-cyan/20" />
      <div
        className="absolute inset-0 rounded-full animate-scan"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, oklch(0.85 0.18 220 / 0.5) 60deg, transparent 90deg)",
        }}
      />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud-cyan"
        style={{ boxShadow: "0 0 8px var(--hud-cyan)" }} />
    </div>
  );
}
