"use client";

import { create } from "zustand";
import type { MusicParams } from "./types";

interface MusicState {
  isPlaying: boolean;
  music: MusicParams | null;
  source: "ai" | "fallback" | "init";
  activeChordIndex: number;
  togglePlayback: () => void;
  setMusic: (m: MusicParams, source: "ai" | "fallback") => void;
  setActiveChordIndex: (i: number) => void;
}

export const useMusicStore = create<MusicState>((set) => ({
  isPlaying: false,
  music: null,
  source: "init",
  activeChordIndex: 0,
  togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setMusic: (music, source) => set({ music, source }),
  setActiveChordIndex: (activeChordIndex) => set({ activeChordIndex }),
}));
