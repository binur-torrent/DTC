"use client";

import { create } from "zustand";
import type { CognitiveFrame } from "./types";

type Status = "connecting" | "connected" | "disconnected";

interface CognitiveState {
  status: Status;
  frame: CognitiveFrame | null;
  history: CognitiveFrame[]; // last ~6s @ 30Hz = 180 frames
  setStatus: (s: Status) => void;
  pushFrame: (f: CognitiveFrame) => void;
}

const HISTORY_SIZE = 180;

export const useCognitiveStore = create<CognitiveState>((set) => ({
  status: "connecting",
  frame: null,
  history: [],
  setStatus: (status) => set({ status }),
  pushFrame: (f) =>
    set((s) => {
      const next = s.history.length >= HISTORY_SIZE ? s.history.slice(1) : s.history.slice();
      next.push(f);
      return { frame: f, history: next };
    }),
}));
