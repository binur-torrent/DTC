"use client";

import { create } from "zustand";
import type { CognitiveFrame, WSMessage } from "./types";

type Status = "connecting" | "connected" | "disconnected";

interface CognitiveState {
  status: Status;
  isConnectEnabled: boolean;
  frame: CognitiveFrame | null;
  history: CognitiveFrame[];
  socket: WebSocket | null;
  setStatus: (s: Status) => void;
  setConnectEnabled: (enabled: boolean) => void;
  setSocket: (ws: WebSocket | null) => void;
  pushFrame: (f: CognitiveFrame) => void;
  sendMessage: (msg: WSMessage) => void;
}

const HISTORY_SIZE = 180;

export const useCognitiveStore = create<CognitiveState>((set, get) => ({
  status: "disconnected",
  isConnectEnabled: false,
  frame: null,
  history: [],
  socket: null,
  setStatus: (status) => set({ status }),
  setConnectEnabled: (enabled) => set({ isConnectEnabled: enabled }),
  setSocket: (socket) => set({ socket }),
  pushFrame: (f) =>
    set((s) => {
      const next = s.history.length >= HISTORY_SIZE ? s.history.slice(1) : s.history.slice();
      next.push(f);
      return { frame: f, history: next };
    }),
  sendMessage: (msg) => {
    const { socket } = get();
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }
}));
