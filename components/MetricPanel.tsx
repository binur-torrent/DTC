"use client";

import { useCognitiveStore } from "@/lib/cognitiveStore";
import type { CognitiveFrame } from "@/lib/types";

type MetricKey = "focus" | "stress" | "calmness" | "cognitiveLoad" | "emotionalIntensity";

const ACCENT: Record<MetricKey, { bar: string; glow: string; text: string }> = {
  focus:              { bar: "bg-neural-cyan",    glow: "rgba(34,211,238,0.55)",  text: "text-neural-cyan" },
  stress:             { bar: "bg-neural-rose",    glow: "rgba(251,113,133,0.55)", text: "text-neural-rose" },
  calmness:           { bar: "bg-neural-indigo",  glow: "rgba(99,102,241,0.55)",  text: "text-neural-indigo" },
  cognitiveLoad:      { bar: "bg-neural-amber",   glow: "rgba(251,191,36,0.55)",  text: "text-neural-amber" },
  emotionalIntensity: { bar: "bg-neural-magenta", glow: "rgba(232,121,249,0.55)", text: "text-neural-magenta" },
};

const LABEL: Record<MetricKey, string> = {
  focus: "FOCUS",
  stress: "STRESS",
  calmness: "CALMNESS",
  cognitiveLoad: "COGNITIVE LOAD",
  emotionalIntensity: "EMOTIONAL INTENSITY",
};

export function MetricPanel({ metric }: { metric: MetricKey }) {
  const value = useCognitiveStore((s) => (s.frame ? (s.frame[metric] as number) : 0));
  const accent = ACCENT[metric];
  const pct = Math.round(value * 100);

  return (
    <div className="panel relative px-4 py-3">
      <span className="corner-bracket tl" />
      <span className="corner-bracket tr" />
      <span className="corner-bracket bl" />
      <span className="corner-bracket br" />

      <div className="flex items-baseline justify-between mb-2">
        <span className="label-mono">{LABEL[metric]}</span>
        <span className={`font-mono text-sm tabular-nums ${accent.text}`} style={{ textShadow: `0 0 10px ${accent.glow}` }}>
          {pct.toString().padStart(2, "0")}
        </span>
      </div>

      <div className="relative h-1.5 w-full bg-bone/5 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${accent.bar} rounded-full`}
          style={{
            width: `${Math.max(0, Math.min(100, value * 100))}%`,
            transition: "width 120ms linear",
            boxShadow: `0 0 10px ${accent.glow}, 0 0 20px ${accent.glow}`,
          }}
        />
      </div>
    </div>
  );
}

export type { MetricKey };
export type { CognitiveFrame };
