export function StarkTower() {
  return (
    <div className="flex justify-center py-2">
      <svg viewBox="0 0 120 140" className="h-32 w-24"
        style={{ filter: "drop-shadow(0 0 10px var(--hud-cyan))" }}>
        <g fill="none" stroke="oklch(0.85 0.18 220 / 0.8)" strokeWidth="1">
          <path d="M55 12 L 65 12 L 70 30 L 50 30 Z" fill="oklch(0.85 0.18 220 / 0.15)" />
          <path d="M50 30 L 70 30 L 75 70 L 45 70 Z" fill="oklch(0.85 0.18 220 / 0.1)" />
          <path d="M45 70 L 75 70 L 82 110 L 38 110 Z" fill="oklch(0.85 0.18 220 / 0.08)" />
          <path d="M38 110 L 82 110 L 90 128 L 30 128 Z" />
          <path d="M30 128 L 90 128 L 100 134 L 20 134 Z" />
          {[40, 55, 70, 90, 105].map((y, i) => (
            <line key={i} x1={45 - i * 2} y1={y} x2={75 + i * 2} y2={y} opacity="0.5" />
          ))}
          <line x1="60" y1="2" x2="60" y2="12" strokeWidth="0.5" />
          <circle cx="60" cy="2" r="1.5" fill="var(--hud-cyan)" />
        </g>
      </svg>
    </div>
  );
}
