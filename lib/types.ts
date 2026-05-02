export type Mood = "calm" | "focused" | "engaged" | "overloaded" | "drifting";

export type ScenePhase = "calm" | "focus_rise" | "deep_focus" | "overload" | "recovery";

export interface CognitiveFrame {
  t: number;
  alpha: number;
  beta: number;
  theta: number;
  gamma?: number;
  delta?: number;
  fft?: number[];
  focus: number;
  stress: number;
  calmness: number;
  cognitiveLoad: number;
  emotionalIntensity: number;
  mood: Mood;
  bpm: number;
  phase: ScenePhase;
  datasetLabel?: string;
}

export type WSMessage =
  | { type: "heartbeat"; t: number }
  | { type: "frame"; frame: CognitiveFrame }
  | { type: "set_mode"; mode: "sim" | "dataset"; label?: string };
