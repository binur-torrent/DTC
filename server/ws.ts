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
      // Amplify bands based on emotion to make the visualizer react vividly
      let alpha = frame.alpha;
      let beta = frame.beta;
      let theta = frame.theta;
      let phase: any;
      
      if (frame.label === "POSITIVE") {
        // High energy, bright, focused
        beta = Math.min(1, beta * 1.8); 
        alpha = Math.min(1, alpha * 2.0); 
        theta = Math.max(0, theta * 0.5); 
        phase = "deep_focus";
      } else if (frame.label === "NEGATIVE") {
        // Tense, stressful, chaotic
        beta = Math.min(1, beta * 2.5); 
        alpha = Math.max(0, alpha * 0.1); 
        theta = Math.min(1, theta * 2.0); 
        phase = "overload";
      } else {
        // NEUTRAL - stable baseline
        alpha = 0.5;
        beta = 0.3;
        theta = 0.4;
        phase = "calm";
      }

      bands = {
        alpha,
        beta,
        theta,
        gamma: frame.gamma,
        delta: frame.delta,
        fft: frame.fft,
        phase
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
