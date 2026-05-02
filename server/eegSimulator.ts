import type { ScenePhase } from "../lib/types";

interface SceneStep {
  phase: ScenePhase;
  alpha: number;
  beta: number;
  theta: number;
  duration: number;
}

// Auto-scripted scene loop ~90s. Drives baselines; the simulator overlays
// breathing sines, 1/f-ish drift, and event spikes on top so each loop
// looks identical-but-organic across runs.
const SCENE: SceneStep[] = [
  { phase: "calm",       alpha: 0.74, beta: 0.24, theta: 0.36, duration: 22 },
  { phase: "focus_rise", alpha: 0.50, beta: 0.52, theta: 0.30, duration: 10 },
  { phase: "deep_focus", alpha: 0.40, beta: 0.74, theta: 0.22, duration: 15 },
  { phase: "overload",   alpha: 0.28, beta: 0.92, theta: 0.44, duration: 12 },
  { phase: "recovery",   alpha: 0.64, beta: 0.40, theta: 0.34, duration: 18 },
];

const TOTAL = SCENE.reduce((s, p) => s + p.duration, 0);

class LowpassNoise {
  private state = 0;
  constructor(private smoothing: number) {}
  tick(): number {
    const n = (Math.random() - 0.5) * 2;
    this.state = this.smoothing * this.state + (1 - this.smoothing) * n;
    return this.state;
  }
}

export interface BandsOut {
  phase: ScenePhase;
  alpha: number;
  beta: number;
  theta: number;
}

export class EEGSimulator {
  private startMs = Date.now();
  private alphaDrift = new LowpassNoise(0.985);
  private betaDrift = new LowpassNoise(0.965);
  private thetaDrift = new LowpassNoise(0.99);

  tick(nowMs: number): BandsOut {
    const elapsed = (nowMs - this.startMs) / 1000;
    const tgt = targetAt(elapsed);

    // Slow breathing (~35s) and a faster ripple (~12s) keep the bands
    // organically alive instead of sitting on the scene baseline.
    const breath = Math.sin(elapsed * ((2 * Math.PI) / 35)) * 0.04;
    const ripple = Math.sin(elapsed * ((2 * Math.PI) / 12)) * 0.03;

    let alpha = tgt.alpha + breath + this.alphaDrift.tick() * 0.06;
    let beta = tgt.beta + ripple + this.betaDrift.tick() * 0.09;
    let theta = tgt.theta + breath * 0.5 + this.thetaDrift.tick() * 0.05;

    // High beta suppresses alpha; theta rises when neither alpha nor beta dominates.
    alpha -= Math.max(0, beta - 0.6) * 0.18;
    theta += Math.max(0, 0.4 - alpha) * 0.08;

    // Overload occasionally jolts beta/theta to feel chaotic.
    if (tgt.phase === "overload" && Math.random() < 0.05) {
      beta += 0.07;
      theta += 0.05;
    }

    return {
      phase: tgt.phase,
      alpha: clamp01(alpha),
      beta: clamp01(beta),
      theta: clamp01(theta),
    };
  }
}

function targetAt(elapsedSec: number): { phase: ScenePhase; alpha: number; beta: number; theta: number } {
  const t = elapsedSec % TOTAL;
  let acc = 0;
  for (let i = 0; i < SCENE.length; i++) {
    const cur = SCENE[i];
    const next = SCENE[(i + 1) % SCENE.length];
    const phaseEnd = acc + cur.duration;
    if (t < phaseEnd) {
      const localT = (t - acc) / cur.duration;
      // Dwell on current target for the first 70% of the phase, smoothly
      // crossfade into the next target for the final 30%.
      const blend = smoothstep(0.7, 1.0, localT);
      return {
        phase: cur.phase,
        alpha: lerp(cur.alpha, next.alpha, blend),
        beta: lerp(cur.beta, next.beta, blend),
        theta: lerp(cur.theta, next.theta, blend),
      };
    }
    acc = phaseEnd;
  }
  return { phase: SCENE[0].phase, alpha: SCENE[0].alpha, beta: SCENE[0].beta, theta: SCENE[0].theta };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
