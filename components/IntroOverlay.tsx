"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCognitiveStore } from "@/lib/cognitiveStore";

export function IntroOverlay() {
  const [show, setShow] = useState(true);
  const [hover, setHover] = useState(false);
  const status = useCognitiveStore((s) => s.status);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") setShow(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const linkLabel =
    status === "connected" ? "STREAM :: STABLE" :
    status === "connecting" ? "STREAM :: NEGOTIATING" :
    "STREAM :: WAITING";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-50 bg-ink flex items-center justify-center overflow-hidden"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(34,211,238,0.5) 0px, rgba(34,211,238,0.5) 1px, transparent 1px, transparent 3px)",
            }}
          />

          <motion.div
            className="absolute w-[60vmin] h-[60vmin] rounded-full border border-neural-cyan/25"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1, 0.95], opacity: [0, 0.55, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[42vmin] h-[42vmin] rounded-full border border-neural-indigo/35"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.15], opacity: [0, 0.45, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-[24vmin] h-[24vmin] rounded-full bg-neural-cyan/5"
            initial={{ scale: 0.9, opacity: 0.3 }}
            animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative text-center px-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <div className="label-mono mb-4">SYSTEM :: WAVY :: v0.1 // {linkLabel}</div>
              <h1
                className="font-mono text-6xl md:text-7xl tracking-[0.45em] text-bone"
                style={{ textShadow: "0 0 28px rgba(34,211,238,0.7), 0 0 80px rgba(99,102,241,0.35)" }}
              >
                WAVY
              </h1>
              <div className="label-mono mt-4">
                NEUROADAPTIVE INTERFACE — COGNITIVE-AWARE COMPUTING
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-6 max-w-md mx-auto font-mono text-[11px] leading-relaxed text-bone/55"
            >
              Wavy reads simulated EEG, infers cognitive state in realtime, and
              adapts its environment — visuals, narration, and audio — to the
              user's mind.
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.85 }}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              onClick={() => setShow(false)}
              className="relative mt-10 panel px-8 py-3 font-mono text-[11px] tracking-[0.4em] uppercase text-neural-cyan"
              style={{ textShadow: "0 0 14px rgba(34,211,238,0.7)" }}
            >
              <span className="corner-bracket tl" />
              <span className="corner-bracket tr" />
              <span className="corner-bracket bl" />
              <span className="corner-bracket br" />
              {hover ? ">> INITIALIZING" : "INITIALIZE NEUROADAPTIVE SESSION"}
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1.2 }}
              className="mt-6 label-mono"
            >
              PRESS ENTER OR CLICK TO BEGIN  ·  SIMULATED EEG STREAM
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
