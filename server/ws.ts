import { WebSocketServer } from "ws";
import { EEGSimulator } from "./eegSimulator";
import { StateInterpreter } from "./stateInterpreter";
import type { CognitiveFrame } from "../lib/types";

const PORT = Number(process.env.WS_PORT ?? 3940);
const FPS = 30;

const sim = new EEGSimulator();
const interp = new StateInterpreter();
const wss = new WebSocketServer({ port: PORT });

let lastFrame: CognitiveFrame | null = null;

console.log(`[wavy/ws] listening on ws://localhost:${PORT} @ ${FPS}Hz`);

setInterval(() => {
  const now = Date.now();
  const bands = sim.tick(now);
  const frame = interp.process(now, bands);
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
  ws.on("close", () => console.log("[wavy/ws] client disconnected"));
});
