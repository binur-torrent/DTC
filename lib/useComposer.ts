"use client";

import { useEffect, useRef } from "react";
import { useCognitiveStore } from "./cognitiveStore";
import { useMusicStore } from "./musicStore";
import { getAudioEngine } from "./audioEngine";
import type { MusicParams } from "./types";

const COMPOSE_INTERVAL_MS = 5_000; // poll AI every 5s
const FIRST_DELAY_MS = 3_000;

export function useComposer() {
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const setMusic = useMusicStore((s) => s.setMusic);
  const setActiveChordIndex = useMusicStore((s) => s.setActiveChordIndex);
  const engineRef = useRef(getAudioEngine());

  // Start/stop audio engine based on playback state
  useEffect(() => {
    const engine = engineRef.current;
    if (isPlaying) {
      engine.start((idx) => setActiveChordIndex(idx));
    } else {
      engine.stop();
    }
    return () => {
      if (engine.isRunning()) engine.stop();
    };
  }, [isPlaying, setActiveChordIndex]);

  // Poll the AI composer API
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (stopped) return;

      const history = useCognitiveStore.getState().history;
      const playing = useMusicStore.getState().isPlaying;

      if (history.length < 5 || !playing) {
        timer = setTimeout(tick, 1000);
        return;
      }

      // Downsample history to ~20 frames
      const step = Math.max(1, Math.floor(history.length / 20));
      const window = history.filter((_, i) => i % step === 0);

      try {
        const r = await fetch("/api/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ window }),
          cache: "no-store",
        });
        const data = await r.json();

        if (!stopped && data.music) {
          const music = data.music as MusicParams;
          const source = data.source as "ai" | "fallback";
          setMusic(music, source);

          // Update the audio engine with new params
          const engine = engineRef.current;
          if (engine.isRunning()) {
            engine.updateMusic(music);
          }
        }
      } catch {
        // network error — leave previous music running
      }

      if (!stopped) timer = setTimeout(tick, COMPOSE_INTERVAL_MS);
    };

    timer = setTimeout(tick, FIRST_DELAY_MS);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [setMusic]);
}
