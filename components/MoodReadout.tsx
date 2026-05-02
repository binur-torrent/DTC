"use client";

import { useCognitiveStore } from "@/lib/cognitiveStore";
import type { Mood } from "@/lib/types";

const MOOD_COLOR: Record<Mood, { ring: string; text: string; glow: string }> = {
  calm:       { ring: "border-neural-indigo",  text: "text-neural-indigo",  glow: "rgba(99,102,241,0.55)" },
  focused:    { ring: "border-neural-cyan",    text: "text-neural-cyan",    glow: "rgba(34,211,238,0.55)" },
  engaged:    { ring: "border-neural-magenta", text: "text-neural-magenta", glow: "rgba(232,121,249,0.55)" },
  overloaded: { ring: "border-neural-rose",    text: "text-neural-rose",    glow: "rgba(251,113,133,0.65)" },
  drifting:   { ring: "border-neural-amber",   text: "text-neural-amber",   glow: "rgba(251,191,36,0.55)" },
};

export function MoodReadout() {
  const frame = useCognitiveStore((s) => s.frame);
  const mood: Mood = frame?.mood ?? "calm";
  const bpm = frame?.bpm ?? 0;
  const phase = frame?.phase ?? "calm";
  const c = MOOD_COLOR[mood];

  return (
    <div className="panel relative p-4 flex flex-col items-center justify-between gap-4">
      <span className="corner-bracket tl" />
      <span className="corner-bracket tr" />
      <span className="corner-bracket bl" />
      <span className="corner-bracket br" />

      <div className="w-full flex items-center justify-between">
        <span className="label-mono">COGNITIVE STATE</span>
        <span className="label-mono">PHASE :: {phase.replace("_", " ")}</span>
      </div>

      <div
        className={`relative w-28 h-28 rounded-full border ${c.ring} flex items-center justify-center`}
        style={{ boxShadow: `0 0 28px ${c.glow}, inset 0 0 18px ${c.glow}` }}
      >
        <div
          className={`absolute inset-2 rounded-full border ${c.ring} opacity-40 animate-pulse-slow`}
        />
        <div className={`font-mono text-[11px] uppercase tracking-[0.25em] ${c.text} glow-text`}>
          {mood}
        </div>
      </div>

      <div className="w-full flex items-end justify-between">
        <span className="label-mono">CARDIAC</span>
        <div className="flex items-baseline gap-1">
          <span
            className={`font-mono text-3xl tabular-nums ${c.text} glow-text`}
            style={{ transition: "color 400ms" }}
          >
            {bpm.toFixed(0)}
          </span>
          <span className="label-mono">BPM</span>
        </div>
      </div>
    </div>
  );
}
