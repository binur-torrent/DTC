export type Mood = "calm" | "focused" | "engaged" | "overloaded" | "drifting";

export type ScenePhase = "calm" | "focus_rise" | "deep_focus" | "overload" | "recovery";

export interface CognitiveFrame {
  t: number;
  alpha: number;
  beta: number;
  theta: number;
  focus: number;
  stress: number;
  calmness: number;
  cognitiveLoad: number;
  emotionalIntensity: number;
  mood: Mood;
  bpm: number;
  phase: ScenePhase;
}

export type WSMessage =
  | { type: "heartbeat"; t: number }
  | { type: "frame"; frame: CognitiveFrame };
