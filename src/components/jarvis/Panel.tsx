import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hud-panel rounded-sm p-3 animate-fade-in", className)}>
      {title && (
        <div className="mb-2 flex items-center gap-2 text-[10px] font-display tracking-[0.3em] text-hud-cyan/90">
          <span className="h-1.5 w-1.5 bg-hud-cyan animate-pulse-glow" />
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatRow({
  label,
  value,
  status,
}: {
  label: string;
  value?: string;
  status?: "online" | "warn" | "off";
}) {
  const color =
    status === "online"
      ? "text-hud-green"
      : status === "warn"
        ? "text-hud-orange"
        : status === "off"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="flex items-center justify-between border-b border-hud-cyan/10 py-1.5 text-[11px] last:border-b-0">
      <span className="tracking-widest text-muted-foreground uppercase">{label}</span>
      <span className={cn("font-display tracking-wider hud-text-glow", color)}>{value}</span>
    </div>
  );
}

export function Bar({ value }: { value: number }) {
  return (
    <div className="hud-bar">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export function MiniGraph({ seed = 1, color = "var(--hud-cyan)" }: { seed?: number; color?: string }) {
  const bars = Array.from({ length: 32 }, (_, i) => {
    const v = (Math.sin(i * 0.6 + seed) + Math.cos(i * 0.3 + seed * 2)) * 0.5 + 0.5;
    return Math.max(0.15, Math.min(1, v));
  });
  return (
    <div className="flex h-8 items-end gap-px">
      {bars.map((h, i) => (
        <span
          key={i}
          className="flex-1"
          style={{
            height: `${h * 100}%`,
            background: color,
            opacity: 0.4 + h * 0.6,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      ))}
    </div>
  );
}
