"use client";

import { create } from "zustand";
import type { CognitiveFrame, WSMessage } from "./types";

type Status = "connecting" | "connected" | "disconnected";

interface CognitiveState {
  status: Status;
  isConnectEnabled: boolean;
  frame: CognitiveFrame | null;
  history: CognitiveFrame[];
  sessionStartTime: number | null;
  sessionHistory: CognitiveFrame[];
  socket: WebSocket | null;
  setStatus: (s: Status) => void;
  setConnectEnabled: (enabled: boolean) => void;
  setSocket: (ws: WebSocket | null) => void;
  pushFrame: (f: CognitiveFrame) => void;
  startSession: () => void;
  endSession: () => Promise<void>;
  sendMessage: (msg: WSMessage) => void;
}

const HISTORY_SIZE = 180;

export const useCognitiveStore = create<CognitiveState>((set, get) => ({
  status: "disconnected",
  isConnectEnabled: false,
  frame: null,
  history: [],
  sessionStartTime: null,
  sessionHistory: [],
  socket: null,
  setStatus: (status) => set({ status }),
  setConnectEnabled: (enabled) => set({ isConnectEnabled: enabled }),
  setSocket: (socket) => set({ socket }),
  pushFrame: (f) =>
    set((s) => {
      const next = s.history.length >= HISTORY_SIZE ? s.history.slice(1) : s.history.slice();
      next.push(f);
      
      const nextSessionHistory = s.sessionStartTime ? [...s.sessionHistory, f] : [];
      return { frame: f, history: next, sessionHistory: nextSessionHistory };
    }),
  startSession: () => set({ sessionStartTime: Date.now(), sessionHistory: [] }),
  endSession: async () => {
    const { sessionStartTime, sessionHistory, frame } = get();
    if (!sessionStartTime) return;
    
    set({ sessionStartTime: null, sessionHistory: [] });
    
    if (sessionHistory.length === 0) return;
    
    const durationMs = Date.now() - sessionStartTime;
    const avgFocus = sessionHistory.reduce((acc, f) => acc + f.focus, 0) / sessionHistory.length;
    const avgStress = sessionHistory.reduce((acc, f) => acc + f.stress, 0) / sessionHistory.length;
    const avgCalmness = sessionHistory.reduce((acc, f) => acc + f.calmness, 0) / sessionHistory.length;
    const dataSource = frame?.datasetLabel || "SIM";
    
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMs, avgFocus, avgStress, avgCalmness, dataSource }),
      });
    } catch (err) {
      console.error("Failed to save session", err);
    }
  },
  sendMessage: (msg) => {
    const { socket } = get();
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }
}));
