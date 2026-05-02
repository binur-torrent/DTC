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

export interface MusicParams {
  key: string;           // e.g. "C", "Am", "F#m"
  scale: string;         // e.g. "major", "minor", "dorian"
  chords: string[];      // 4-chord progression, e.g. ["Cmaj", "Am", "Fmaj", "Gmaj"]
  tempo: number;         // BPM 40–160
  instrument: string;    // "piano", "synth", "bell", "strings"
  intensity: number;     // 0–1
  description: string;   // AI's short description of musical mood
}

export type WSMessage =
  | { type: "heartbeat"; t: number }
  | { type: "frame"; frame: CognitiveFrame }
  | { type: "set_mode"; mode: "sim" | "dataset"; label?: string };
