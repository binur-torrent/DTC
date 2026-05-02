"use client";

import dynamic from "next/dynamic";
import { useCognitiveStream } from "@/lib/useCognitiveStream";
import { useCognitiveStore } from "@/lib/cognitiveStore";
import { MetricPanel } from "@/components/MetricPanel";
import { BrainwaveGraph } from "@/components/BrainwaveGraph";
import { MoodReadout } from "@/components/MoodReadout";
import { HudHeader } from "@/components/HudHeader";
import { NarratorOverlay } from "@/components/NarratorOverlay";
import { IntroOverlay } from "@/components/IntroOverlay";

const NeuralField = dynamic(
  () => import("@/components/NeuralField").then((m) => m.NeuralField),
  { ssr: false },
);

export default function Home() {
  useCognitiveStream();
  const status = useCognitiveStore((s) => s.status);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink text-bone flex flex-col">
      <IntroOverlay />
      <HudHeader />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(34,211,238,0.4) 0px, rgba(34,211,238,0.4) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div
        className="pointer-events-none absolute left-0 right-0 h-24 animate-scan"
        style={{
          background:
            "linear-gradient(180deg, rgba(34,211,238,0) 0%, rgba(34,211,238,0.06) 50%, rgba(34,211,238,0) 100%)",
        }}
      />

      <section className="relative flex-1 grid grid-cols-[280px_1fr_300px] gap-4 p-4 min-h-0">
        <aside className="flex flex-col gap-3">
          <MetricPanel metric="focus" />
          <MetricPanel metric="stress" />
          <MetricPanel metric="calmness" />
          <MetricPanel metric="cognitiveLoad" />
          <MetricPanel metric="emotionalIntensity" />
        </aside>

        <section className="relative panel overflow-hidden">
          <span className="corner-bracket tl z-20" />
          <span className="corner-bracket tr z-20" />
          <span className="corner-bracket bl z-20" />
          <span className="corner-bracket br z-20" />

          <div className="absolute top-3 left-4 label-mono z-20">NEURAL FIELD :: LIVE</div>
          <div className="absolute top-3 right-4 label-mono z-20">
            RENDER :: {status === "connected" ? "ACTIVE" : "STANDBY"}
          </div>
          <div className="absolute bottom-3 left-4 label-mono z-20">
            PARTICLES :: 8000 // SHADER :: COGNITIVE-DRIVEN
          </div>

          <div className="absolute inset-0">
            <NeuralField />
          </div>

          <NarratorOverlay />
        </section>

        <aside className="flex flex-col gap-3">
          <MoodReadout />
          <RawBandsPanel />
        </aside>
      </section>

      <section className="relative h-44 px-4 pb-4 min-h-0">
        <BrainwaveGraph />
      </section>
    </main>
  );
}

function RawBandsPanel() {
  const frame = useCognitiveStore((s) => s.frame);
  const a = frame?.alpha ?? 0;
  const b = frame?.beta ?? 0;
  const t = frame?.theta ?? 0;
  return (
    <div className="panel relative p-4 flex flex-col gap-2">
      <span className="corner-bracket tl" />
      <span className="corner-bracket tr" />
      <span className="corner-bracket bl" />
      <span className="corner-bracket br" />
      <span className="label-mono">RAW BANDS</span>
      <Row label="α ALPHA" value={a} color="text-neural-cyan"    glow="rgba(34,211,238,0.6)" />
      <Row label="β BETA"  value={b} color="text-neural-magenta" glow="rgba(232,121,249,0.6)" />
      <Row label="θ THETA" value={t} color="text-neural-amber"   glow="rgba(251,191,36,0.6)" />
    </div>
  );
}

function Row({ label, value, color, glow }: { label: string; value: number; color: string; glow: string }) {
  return (
    <div className="flex items-center justify-between font-mono text-xs">
      <span className="label-mono">{label}</span>
      <span className={`tabular-nums ${color}`} style={{ textShadow: `0 0 8px ${glow}` }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}
