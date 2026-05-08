import { useEffect, useState } from "react";

export function Waveform({ bars = 48, active = true }: { bars?: number; active?: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 110);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="flex h-10 items-center gap-[2px]">
      {Array.from({ length: bars }).map((_, i) => {
        const h = active
          ? Math.abs(Math.sin(i * 0.4 + tick * 0.3) * Math.cos(i * 0.2 + tick * 0.15)) * 100
          : 8;
        return (
          <span
            key={i}
            className="flex-1 rounded-sm bg-hud-cyan transition-all duration-150"
            style={{
              height: `${Math.max(6, h)}%`,
              boxShadow: "0 0 6px var(--hud-cyan)",
              opacity: 0.5 + h / 200,
            }}
          />
        );
      })}
    </div>
  );
}
