"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useNarrator } from "@/lib/useNarrator";

export function NarratorOverlay() {
  const { text, source } = useNarrator();
  const display = text || "calibrating cognitive narrator…";
  const sourceLabel =
    source === "claude" ? "CLAUDE HAIKU 4.5" :
    source === "fallback" ? "DETERMINISTIC FALLBACK" :
    source === "error" ? "FALLBACK :: API ERROR" :
    "INITIALIZING";

  return (
    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-6 z-20 w-[min(560px,92%)]">
      <div className="panel relative px-6 py-4">
        <span className="corner-bracket tl" />
        <span className="corner-bracket tr" />
        <span className="corner-bracket bl" />
        <span className="corner-bracket br" />

        <div className="flex items-center justify-between mb-2">
          <span className="label-mono">COGNITIVE NARRATOR</span>
          <span className="label-mono">{sourceLabel}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="font-mono text-sm text-bone text-center glow-text leading-relaxed"
            style={{ textShadow: "0 0 14px rgba(34,211,238,0.35)" }}
          >
            {display}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
