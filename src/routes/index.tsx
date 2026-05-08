import { createFileRoute } from "@tanstack/react-router";
import { Background } from "@/components/jarvis/Background";
import { JarvisCore } from "@/components/jarvis/JarvisCore";
import { Panel, StatRow, Bar, MiniGraph } from "@/components/jarvis/Panel";
import { AssistantPanel } from "@/components/jarvis/AssistantPanel";
import { Waveform } from "@/components/jarvis/Waveform";
import { Radar } from "@/components/jarvis/Radar";
import { BottomNav } from "@/components/jarvis/BottomNav";
import { IronHelmet } from "@/components/jarvis/IronHelmet";
import { StarkTower } from "@/components/jarvis/StarkTower";
import { useClock, useLiveMetric } from "@/hooks/use-clock";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "JARVIS — Stark Industries AI Interface" },
      { name: "description", content: "JARVIS 2.0 holographic AI control interface — live diagnostics, voice recognition, and environmental telemetry." },
    ],
  }),
});

function Index() {
  const { time, date } = useClock();
  const coreTemp = useLiveMetric(36.4, 38.1, 0.2);
  const memory = useLiveMetric(38, 56, 1.2);
  const processor = useLiveMetric(18, 42, 1.5);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Share+Tech+Mono&display=swap"
      />
      <Background />

      <main className="relative h-screen w-screen overflow-hidden p-4">
        {/* Top bar */}
        <header className="flex items-start justify-between gap-4">
          <div className="font-display text-[10px] tracking-[0.4em] text-hud-cyan/70 animate-flicker">
            ◣ STARK NETWORK · NODE 001 · SECURE LINK
          </div>
          <div className="font-display text-sm tracking-[0.5em] text-hud-cyan hud-text-glow animate-flicker">
            STARK INDUSTRIES
          </div>
          <div className="font-display text-[10px] tracking-[0.4em] text-hud-cyan/70 animate-flicker">
            ENCRYPTION · AES-512 · ACTIVE ◢
          </div>
        </header>

        {/* Main grid */}
        <div className="mt-4 grid h-[calc(100vh-9rem)] grid-cols-12 gap-4">
          {/* LEFT COLUMN */}
          <aside className="col-span-3 flex flex-col gap-3 overflow-hidden">
            <Panel title="SYSTEM STATUS">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-hud-green animate-pulse-glow"
                  style={{ boxShadow: "0 0 10px var(--hud-green)" }} />
                <span className="font-display text-lg tracking-widest text-hud-green hud-text-glow">
                  ONLINE
                </span>
              </div>
              <IronHelmet />
              <div className="mt-2 text-center">
                <div className="font-display text-base tracking-[0.2em] text-foreground">JARVIS 2.0.0</div>
                <div className="text-[10px] tracking-[0.3em] text-muted-foreground">AI CORE SYSTEM</div>
              </div>
            </Panel>

            <Panel title="CORE TEMPERATURE">
              <div className="font-display text-2xl text-foreground hud-text-glow">
                {coreTemp.toFixed(1)} <span className="text-sm text-hud-cyan">°C</span>
              </div>
              <div className="mt-1"><MiniGraph seed={1} /></div>
            </Panel>

            <Panel title="MEMORY USAGE">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-display text-xl text-foreground hud-text-glow">{memory.toFixed(0)}%</span>
                <span className="text-[10px] tracking-widest text-muted-foreground">32GB / 56GB</span>
              </div>
              <Bar value={memory} />
              <div className="mt-2"><MiniGraph seed={3} color="var(--hud-blue)" /></div>
            </Panel>

            <Panel title="PROCESSOR ACTIVITY">
              <div className="mb-1 font-display text-xl text-foreground hud-text-glow">{processor.toFixed(0)}%</div>
              <Bar value={processor} />
              <div className="mt-2"><MiniGraph seed={5} /></div>
            </Panel>

            <Panel title="VOICE RECOGNITION" className="mt-auto">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-hud-green animate-pulse-glow" />
                <span className="font-display text-xs tracking-[0.3em] text-hud-green">ACTIVE</span>
              </div>
              <Waveform bars={40} />
              <div className="mt-2 border-t border-hud-cyan/15 pt-2">
                <div className="text-[9px] tracking-[0.3em] text-muted-foreground">LAST COMMAND</div>
                <div className="font-display text-[11px] tracking-wider text-foreground">
                  ▸ SHOW ME THE MARK 7 STATUS
                </div>
                <div className="mt-1 text-[9px] tracking-[0.3em] text-hud-green">
                  STATUS: COMPLETED
                </div>
              </div>
            </Panel>
          </aside>

          {/* CENTER COLUMN */}
          <section className="col-span-6 flex flex-col items-center justify-between overflow-hidden">
            <JarvisCore />
            <AssistantPanel />
          </section>

          {/* RIGHT COLUMN */}
          <aside className="col-span-3 flex flex-col gap-3 overflow-hidden">
            <Panel title="TIME / DATE / LOCATION">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] tracking-[0.3em] text-muted-foreground">TIME</div>
                  <div className="font-display text-xl text-foreground hud-text-glow tabular-nums">{time}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.3em] text-muted-foreground">DATE</div>
                  <div className="font-display text-xs tracking-wider text-foreground">{date}</div>
                </div>
              </div>
              <div className="mt-2 border-t border-hud-cyan/15 pt-2">
                <div className="text-[9px] tracking-[0.3em] text-muted-foreground">LOCATION</div>
                <div className="font-display text-sm tracking-[0.2em] text-foreground hud-text-glow">STARK TOWER</div>
                <div className="font-display text-[10px] tracking-[0.3em] text-hud-cyan">NEW YORK · USA</div>
              </div>
            </Panel>

            <Panel title="SYSTEM DIAGNOSTICS">
              <StatRow label="POWER CORE" value="100%" status="online" />
              <StatRow label="ARC REACTOR" value="100%" status="online" />
              <StatRow label="SUIT SYSTEMS" value="ONLINE" status="online" />
              <StatRow label="WEAPONS" value="ONLINE" status="online" />
              <StatRow label="PROPULSION" value="ONLINE" status="online" />
              <StatRow label="SENSORS" value="ACTIVE" status="online" />
              <StatRow label="COMMS" value="ONLINE" status="online" />
            </Panel>

            <Panel title="ENVIRONMENTAL">
              <div className="flex gap-3">
                <div className="flex-1 space-y-0.5">
                  <StatRow label="TEMP" value="22 °C" />
                  <StatRow label="HUMIDITY" value="45%" />
                  <StatRow label="PRESSURE" value="1013 hPa" />
                  <StatRow label="WIND" value="6 km/h" />
                </div>
                <Radar />
              </div>
            </Panel>

            <Panel title="STARK TOWER · LIVE">
              <StarkTower />
            </Panel>
          </aside>
        </div>

        {/* Bottom nav */}
        <footer className="absolute inset-x-4 bottom-4">
          <BottomNav />
        </footer>
      </main>
    </>
  );
}
