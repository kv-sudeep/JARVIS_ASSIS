export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.22_0.06_245)_0%,oklch(0.1_0.02_250)_70%,oklch(0.05_0.01_250)_100%)]" />
      <div className="absolute inset-0 hud-grid-bg opacity-50" />
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-hud-blue/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-hud-cyan/10 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,oklch(0_0_0/0.3)_100%)]" />
      {/* particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-hud-cyan/60 animate-float"
          style={{
            top: `${(i * 37) % 100}%`,
            left: `${(i * 53) % 100}%`,
            animationDelay: `${(i % 6) * 0.7}s`,
            animationDuration: `${5 + (i % 5)}s`,
            boxShadow: "0 0 8px var(--hud-cyan)",
          }}
        />
      ))}
    </div>
  );
}
