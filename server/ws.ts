import { WebSocketServer } from "ws";
import { EEGSimulator } from "./eegSimulator";
import { StateInterpreter } from "./stateInterpreter";
import type { CognitiveFrame } from "../lib/types";

import { DatasetPlayback } from "./dataPlayback";

const PORT = Number(process.env.WS_PORT ?? 3940);
const FPS = 30;

const sim = new EEGSimulator();
const dataset = new DatasetPlayback();
const interp = new StateInterpreter();
const wss = new WebSocketServer({ port: PORT });

let mode: "sim" | "dataset" = "sim";

let lastFrame: CognitiveFrame | null = null;

console.log(`[wavy/ws] listening on ws://localhost:${PORT} @ ${FPS}Hz`);

setInterval(() => {
  const now = Date.now();
  let bands: any;
  let label: string | undefined;

  if (mode === "sim") {
    bands = sim.tick(now);
  } else {
    const frame = dataset.tick();
    if (frame) {
      bands = {
        alpha: frame.alpha,
        beta: frame.beta,
        theta: frame.theta,
        gamma: frame.gamma,
        delta: frame.delta,
        fft: frame.fft,
        phase: "calm" // Default phase for dataset
      };
      label = frame.label;
    } else {
      bands = sim.tick(now); // Fallback
    }
  }

  const frame = interp.process(now, bands);
  if (label) frame.datasetLabel = label;
  
  lastFrame = frame;
  const payload = JSON.stringify({ type: "frame", frame });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(payload);
  }
}, Math.round(1000 / FPS));

wss.on("connection", (ws) => {
  console.log("[wavy/ws] client connected");
  if (lastFrame) {
    ws.send(JSON.stringify({ type: "frame", frame: lastFrame }));
  }

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "set_mode") {
        mode = msg.mode;
        if (msg.label) {
          dataset.setLabel(msg.label);
        }
        console.log(`[wavy/ws] switched to ${mode} mode${msg.label ? " (" + msg.label + ")" : ""}`);
      }
    } catch (e) {
      console.error("[wavy/ws] error parsing message", e);
    }
  });

  ws.on("close", () => console.log("[wavy/ws] client disconnected"));
});
