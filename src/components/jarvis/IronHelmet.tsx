export function IronHelmet() {
  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 120 140" className="h-28 w-28 animate-float"
        style={{ filter: "drop-shadow(0 0 12px var(--hud-cyan))" }}>
        <defs>
          <linearGradient id="helmGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.85 0.18 220)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="oklch(0.55 0.2 245)" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#helmGrad)" strokeWidth="1.5">
          <path d="M60 8 C 28 8, 18 38, 22 70 C 24 90, 32 110, 42 124 L 78 124 C 88 110, 96 90, 98 70 C 102 38, 92 8, 60 8 Z" />
          <path d="M30 60 L 50 72 L 50 84 L 35 84 Z" fill="oklch(0.85 0.18 220 / 0.25)" />
          <path d="M90 60 L 70 72 L 70 84 L 85 84 Z" fill="oklch(0.85 0.18 220 / 0.25)" />
          <path d="M50 96 L 70 96 L 66 108 L 54 108 Z" />
          <path d="M42 124 L 50 134 L 70 134 L 78 124" />
          <path d="M40 40 Q 60 30, 80 40" />
        </g>
      </svg>
    </div>
  );
}
