"use client";

import { useEffect } from "react";
import { useCognitiveStore } from "./cognitiveStore";
import type { WSMessage } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3940";

export function useCognitiveStream() {
  const setStatus = useCognitiveStore((s) => s.setStatus);
  const pushFrame = useCognitiveStore((s) => s.pushFrame);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      setStatus("connecting");
      ws = new WebSocket(WS_URL);
      ws.onopen = () => setStatus("connected");
      ws.onclose = () => {
        setStatus("disconnected");
        if (!stopped) retry = setTimeout(connect, 800);
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WSMessage;
          if (msg.type === "frame") pushFrame(msg.frame);
        } catch {
          // ignore malformed
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [setStatus, pushFrame]);
}
