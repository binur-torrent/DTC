"use client";

import { useEffect, useState } from "react";
import { useCognitiveStore } from "./cognitiveStore";

interface NarratorState {
  text: string;
  source: "init" | "fallback" | "claude" | "error";
}

const POLL_MS = 10_000;
const FIRST_DELAY_MS = 2_000;

export function useNarrator(): NarratorState {
  const [state, setState] = useState<NarratorState>({ text: "", source: "init" });

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (stopped) return;
      const history = useCognitiveStore.getState().history;
      if (history.length < 5) {
        timer = setTimeout(tick, 1000);
        return;
      }
      const step = Math.max(1, Math.floor(history.length / 30));
      const window = history.filter((_, i) => i % step === 0);

      try {
        const r = await fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ window }),
          cache: "no-store",
        });
        const data = (await r.json()) as { text: string; source: NarratorState["source"] };
        if (!stopped && data.text) setState({ text: data.text, source: data.source });
      } catch {
        // network blip — leave previous text in place
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };

    timer = setTimeout(tick, FIRST_DELAY_MS);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return state;
}
