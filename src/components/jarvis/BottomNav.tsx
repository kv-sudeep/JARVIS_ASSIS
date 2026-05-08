import { useState } from "react";
import {
  Cog, Shield, Crosshair, Brain, FlaskConical, Radio, Compass, FolderOpen,
} from "lucide-react";

const items = [
  { icon: Cog, label: "SYSTEMS" },
  { icon: Shield, label: "SUIT" },
  { icon: Crosshair, label: "WEAPONS" },
  { icon: Brain, label: "HOLOGRAMS" },
  { icon: FlaskConical, label: "LAB" },
  { icon: Radio, label: "COMMS" },
  { icon: Compass, label: "NAVIGATION" },
  { icon: FolderOpen, label: "FILES" },
];

export function BottomNav() {
  const [active, setActive] = useState(0);
  return (
    <nav className="hud-panel flex items-stretch gap-1 rounded-sm px-2 py-1.5">
      {items.map(({ icon: Icon, label }, i) => {
        const isActive = active === i;
        return (
          <button
            key={label}
            onClick={() => setActive(i)}
            className={`group relative flex flex-1 items-center justify-center gap-2 px-3 py-2 transition-all duration-300 ${
              isActive ? "-translate-y-1" : "hover:-translate-y-0.5"
            }`}
            style={{
              background: isActive
                ? "linear-gradient(180deg, oklch(0.85 0.18 220 / 0.2), transparent)"
                : "transparent",
            }}
          >
            <Icon
              className={`h-4 w-4 transition-colors ${
                isActive ? "text-hud-cyan" : "text-muted-foreground group-hover:text-hud-cyan"
              }`}
              style={isActive ? { filter: "drop-shadow(0 0 6px var(--hud-cyan))" } : {}}
            />
            <span
              className={`font-display text-[10px] tracking-[0.25em] transition-colors ${
                isActive ? "text-hud-cyan hud-text-glow" : "text-muted-foreground group-hover:text-hud-cyan"
              }`}
            >
              {label}
            </span>
            {isActive && (
              <span className="absolute -bottom-0.5 left-1/2 h-px w-12 -translate-x-1/2 bg-hud-cyan"
                style={{ boxShadow: "0 0 8px var(--hud-cyan)" }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
