export function JarvisCore() {
  return (
    <div className="relative flex items-center justify-center" style={{ perspective: "1200px" }}>
      <div
        className="relative h-[520px] w-[520px] flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Outer faint ring */}
        <div
          className="absolute inset-0 rounded-full border border-hud-cyan/20 animate-spin-slower"
          style={{ transform: "rotateX(70deg)" }}
        />

        {/* Ring 1 */}
        <div className="absolute inset-4 rounded-full border-2 border-hud-cyan/40 animate-spin-slow"
          style={{ borderStyle: "dashed", boxShadow: "0 0 30px oklch(0.85 0.18 220 / 0.4) inset" }} />

        {/* Ring 2 (segmented look using conic) */}
        <div
          className="absolute inset-12 rounded-full animate-spin-reverse"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0 8%, var(--hud-cyan) 8% 12%, transparent 12% 22%, var(--hud-blue) 22% 28%, transparent 28% 45%, var(--hud-cyan) 45% 50%, transparent 50% 70%, var(--hud-blue) 70% 76%, transparent 76% 92%, var(--hud-cyan) 92% 96%, transparent 96% 100%)",
            mask: "radial-gradient(circle, transparent 60%, black 62%, black 70%, transparent 72%)",
            WebkitMask: "radial-gradient(circle, transparent 60%, black 62%, black 70%, transparent 72%)",
            filter: "drop-shadow(0 0 18px var(--hud-cyan))",
          }}
        />

        {/* Ring 3 thin */}
        <div className="absolute inset-24 rounded-full border border-hud-cyan/60 animate-spin-slow" />

        {/* Inner ring with ticks */}
        <div className="absolute inset-32 rounded-full border-2 border-hud-blue/60 animate-spin-reverse">
          {Array.from({ length: 36 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-0 h-3 w-px bg-hud-cyan/80"
              style={{
                transform: `translateX(-50%) rotate(${i * 10}deg)`,
                transformOrigin: "50% 156px",
              }}
            />
          ))}
        </div>

        {/* Glow disc */}
        <div className="absolute inset-44 rounded-full bg-gradient-radial from-hud-cyan/40 via-hud-blue/20 to-transparent animate-pulse-glow"
          style={{ background: "radial-gradient(circle, oklch(0.85 0.18 220 / 0.5) 0%, oklch(0.65 0.22 240 / 0.2) 40%, transparent 70%)" }} />

        {/* Core sphere */}
        <div className="relative z-10 flex h-44 w-44 items-center justify-center rounded-full border border-hud-cyan/60"
          style={{
            background: "radial-gradient(circle at 50% 50%, oklch(0.25 0.08 245) 0%, oklch(0.15 0.04 250) 70%, oklch(0.1 0.02 250) 100%)",
            boxShadow: "0 0 60px oklch(0.85 0.18 220 / 0.5), inset 0 0 40px oklch(0.65 0.22 240 / 0.4)",
          }}>
          <div className="text-center">
            <div className="font-display text-3xl font-bold tracking-[0.3em] text-foreground hud-text-glow">
              JARVIS
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.4em] text-hud-cyan/80">
              ONLINE
            </div>
          </div>
        </div>

        {/* Orbiting particles */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <div
            key={i}
            className="absolute inset-0 animate-spin-slow"
            style={{ animationDuration: `${10 + i * 2}s`, animationDirection: i % 2 ? "reverse" : "normal" }}
          >
            <span
              className="absolute h-2 w-2 rounded-full bg-hud-cyan"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translate(${180 + (i % 3) * 20}px) `,
                boxShadow: "0 0 12px var(--hud-cyan)",
              }}
            />
          </div>
        ))}

        {/* Crosshair */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-full w-px bg-hud-cyan/15" />
          <div className="absolute top-1/2 left-0 h-px w-full bg-hud-cyan/15" />
        </div>
      </div>
    </div>
  );
}
