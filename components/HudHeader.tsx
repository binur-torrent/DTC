"use client";

import { useCognitiveStore } from "@/lib/cognitiveStore";

const STATUS_COLOR = {
  connecting:   { dot: "bg-neural-amber",  text: "text-neural-amber",  label: "LINK :: NEGOTIATING" },
  connected:    { dot: "bg-neural-cyan",   text: "text-neural-cyan",   label: "LINK :: STABLE" },
  disconnected: { dot: "bg-neural-rose",   text: "text-neural-rose",   label: "LINK :: LOST" },
} as const;

export function HudHeader() {
  const status = useCognitiveStore((s) => s.status);
  const frame = useCognitiveStore((s) => s.frame);
  const c = STATUS_COLOR[status];

  return (
    <header className="relative w-full px-6 py-3 flex items-center justify-between border-b border-neural-indigo/15 bg-ink/40 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} style={{ boxShadow: `0 0 8px currentColor` }} />
          <span className={`label-mono ${c.text}`}>{c.label}</span>
        </div>
        <span className="label-mono">STREAM :: 30HZ</span>
        <span className="label-mono">CHANNELS :: α β θ</span>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <span className="font-mono uppercase tracking-[0.4em] text-bone text-sm glow-text" style={{ textShadow: "0 0 14px rgba(34,211,238,0.5)" }}>
          WAVY
        </span>
        <span className="label-mono">NEUROADAPTIVE INTERFACE</span>
      </div>

      <div className="flex items-center gap-6">
        <span className="label-mono">SESSION :: LIVE</span>
        <span className="label-mono">
          T :: {frame ? new Date(frame.t).toISOString().slice(11, 19) : "--:--:--"}
        </span>
      </div>
    </header>
  );
}
