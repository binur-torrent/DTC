import type { CognitiveFrame, Mood, ScenePhase } from "../lib/types";
import type { BandsOut } from "./eegSimulator";

// Tunable weights — all live here so we can adjust mapping in the last 30 min.
const FOCUS_BETA = 1.0;
const FOCUS_THETA = -0.5;
const FOCUS_BIAS = 0.20;

const CALM_ALPHA = 1.0;
const CALM_BETA = -0.5;
const CALM_BIAS = 0.30;

const STRESS_BETA = 1.0;
const STRESS_INTENSITY = 0.30;
const STRESS_ALPHA = -0.50;

const LOAD_EMA_ALPHA = 0.04;
const INTENSITY_EMA_ALPHA = 0.05;
const INTENSITY_GAIN = 8;

const BPM_BASELINE = 70;
const BPM_STRESS_GAIN = 30;
const BPM_CALM_GAIN = 15;
const BPM_EMA_ALPHA = 0.03;

export class StateInterpreter {
  private prev: { alpha: number; beta: number; theta: number } | null = null;
  private loadEMA = 0.45;
  private intensityEMA = 0.30;
  private bpmEMA = 72;

  process(nowMs: number, bands: BandsOut): CognitiveFrame {
    const { alpha, beta, theta, phase } = bands;

    let deriv = 0;
    if (this.prev) {
      deriv =
        Math.abs(alpha - this.prev.alpha) +
        Math.abs(beta - this.prev.beta) +
        Math.abs(theta - this.prev.theta);
    }
    this.prev = { alpha, beta, theta };
    this.intensityEMA = ema(
      this.intensityEMA,
      clamp01(deriv * INTENSITY_GAIN),
      INTENSITY_EMA_ALPHA,
    );

    const focus = clamp01(FOCUS_BETA * beta + FOCUS_THETA * theta + FOCUS_BIAS);
    const calmness = clamp01(CALM_ALPHA * alpha + CALM_BETA * beta + CALM_BIAS);
    const stress = clamp01(
      STRESS_BETA * beta + STRESS_INTENSITY * this.intensityEMA + STRESS_ALPHA * alpha,
    );

    this.loadEMA = ema(this.loadEMA, clamp01(beta + 0.6 * theta), LOAD_EMA_ALPHA);
    const cognitiveLoad = this.loadEMA;

    const targetBpm = BPM_BASELINE + stress * BPM_STRESS_GAIN - calmness * BPM_CALM_GAIN;
    this.bpmEMA = ema(this.bpmEMA, targetBpm, BPM_EMA_ALPHA);

    const mood = inferMood({ focus, stress, calmness, cognitiveLoad }, phase);

    return {
      t: nowMs,
      alpha,
      beta,
      theta,
      focus,
      stress,
      calmness,
      cognitiveLoad,
      emotionalIntensity: this.intensityEMA,
      mood,
      bpm: this.bpmEMA,
      phase,
    };
  }
}

function inferMood(
  s: { focus: number; stress: number; calmness: number; cognitiveLoad: number },
  phase: ScenePhase,
): Mood {
  if (phase === "overload" || (s.stress > 0.65 && s.cognitiveLoad > 0.6)) return "overloaded";
  if (s.focus > 0.68) return "focused";
  if (s.calmness > 0.65 && s.focus < 0.5) return "calm";
  if (s.calmness < 0.35 && s.focus < 0.45) return "drifting";
  return "engaged";
}

function ema(prev: number, next: number, a: number): number {
  return prev + (next - prev) * a;
}
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
