"use client";

import { useEffect, useRef } from "react";
import { useCognitiveStore } from "@/lib/cognitiveStore";
import { useMusicStore } from "@/lib/musicStore";

/**
 * Renders a Lissajous standing-wave figure that matches the uploaded reference image:
 * overlapping ellipses that form nodes, compressed into a horizontal rectangle.
 *
 * The pattern uses parametric equations:
 *   x(t) = A * sin(n*t + δ) * envelope(t)
 *   y(t) = B * sin(m*t)     * envelope(t)
 * where envelope pinches to nodes at regular intervals (like a guitar string).
 *
 * Music mapping:
 *   - musical key  → ratio n:m  (different harmonic ratios = different node counts)
 *   - scale        → phase offset δ
 *   - intensity    → amplitude A, B
 *   - tempo        → rotation/drift speed
 *   - stress       → color (warm) / focus → color (cool)
 */

const KEY_RATIO: Record<string, [number, number]> = {
  C:    [3, 2],
  D:    [4, 3],
  E:    [5, 3],
  F:    [5, 4],
  G:    [4, 2],
  A:    [5, 2],
  B:    [7, 4],
  "C#": [7, 5],
  "F#": [6, 5],
  "Bb": [6, 4],
};

const SCALE_DELTA: Record<string, number> = {
  major:      0,
  minor:      Math.PI / 6,
  dorian:     Math.PI / 4,
  phrygian:   Math.PI / 3,
  lydian:     Math.PI / 8,
  mixolydian: Math.PI / 5,
  locrian:    Math.PI / 2,
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function LissajousVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    // Smooth state
    let curN = 3, curM = 2, curDelta = 0;
    let curAmp = 0.5, curSpeed = 0.008;
    let curStress = 0.3, curFocus = 0.4;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = parent.clientWidth * dpr;
        canvas.height = parent.clientHeight * dpr;
        ctx.scale(dpr, dpr);
      }
    };
    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      const music = useMusicStore.getState().music;
      const frame = useCognitiveStore.getState().frame;
      const isPlaying = useMusicStore.getState().isPlaying;

      // Derive target params
      const key = music?.key ?? "C";
      const scale = music?.scale?.toLowerCase() ?? "major";
      const [tN, tM] = KEY_RATIO[key] ?? [3, 2];
      const tDelta = SCALE_DELTA[scale] ?? 0;
      const tAmp = 0.28 + (music?.intensity ?? (frame ? frame.focus * 0.3 : 0.2)) * 0.48;
      const tempo = music?.tempo ?? 72;
      const tSpeed = (isPlaying ? 0.006 : 0.003) * (tempo / 72);
      const tStress = frame?.stress ?? 0.3;
      const tFocus  = frame?.focus  ?? 0.4;

      // Smooth all params
      curN     += (tN     - curN)     * 0.01;
      curM     += (tM     - curM)     * 0.01;
      curDelta += (tDelta - curDelta) * 0.02;
      curAmp   += (tAmp   - curAmp)   * 0.04;
      curSpeed += (tSpeed - curSpeed) * 0.05;
      curStress+= (tStress- curStress)* 0.03;
      curFocus += (tFocus - curFocus) * 0.03;

      t += curSpeed;

      // ── Background ──
      ctx.fillStyle = "#0a0a12";
      ctx.fillRect(0, 0, W, H);

      // ── Color based on mood ──
      let lineColor: string;
      if (curStress > 0.65) {
        lineColor = `rgba(255, ${110 + Math.round(curFocus * 80)}, 40,`;
      } else if (curFocus > 0.6) {
        lineColor = `rgba(60, 160, 255,`;
      } else {
        lineColor = `rgba(30, 215, 180,`;
      }

      const cx = W / 2;
      const cy = H / 2;
      // Half-extents: figure fills the panel horizontally, constrained vertically
      const rX = W * 0.47 * curAmp;
      const rY = H * 0.44;

      // Draw N overlapping Lissajous curves with varying phase shifts
      // This creates the "node rings" from the reference image
      const CURVES = 28;
      const STEPS  = 800;

      for (let c = 0; c < CURVES; c++) {
        const phaseShift = (c / CURVES) * Math.PI * 0.35;
        const alpha = c === 0 ? 0.9 : 0.08 + (1 - c / CURVES) * 0.22;

        ctx.beginPath();
        for (let s = 0; s <= STEPS; s++) {
          const u = (s / STEPS) * Math.PI * 2;

          // Lissajous parametric — note: X and Y swapped + scaled
          // so the figure is HORIZONTAL (matching rotated reference)
          const rawX = Math.sin(curN * u + curDelta + phaseShift + t);
          const rawY = Math.sin(curM * u + phaseShift * 0.5);

          // Envelope: amplitude tapers sinusoidally along the Y axis to create nodes
          const envelope = Math.cos(curM * 0.5 * u);
          const px = cx + rawX * rX * Math.abs(envelope);
          const py = cy + rawY * rY;

          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        ctx.strokeStyle = `${lineColor}${alpha.toFixed(2)})`;
        ctx.lineWidth = c === 0 ? 1.5 : 0.6;
        ctx.stroke();
      }

      // ── Subtle glowing center line ──
      ctx.beginPath();
      ctx.moveTo(cx - rX * 0.02, cy - rY);
      ctx.lineTo(cx - rX * 0.02, cy + rY);
      ctx.strokeStyle = `${lineColor}0.12)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Border pulse when playing ──
      if (isPlaying) {
        const pulse = 0.15 + 0.1 * Math.sin(t * 8);
        ctx.strokeStyle = `${lineColor}${pulse.toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(1, 1, W - 2, H - 2);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      className="w-full bg-[#0a0a12] rounded-xl border border-white/10 overflow-hidden shadow-lg relative"
      style={{ height: 220 }}
    >
      {/* Labels */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        <span className="text-white/40 font-mono text-[9px] uppercase tracking-widest">
          Standing Wave // Lissajous
        </span>
      </div>
      <MusicKeyLabel />
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

function MusicKeyLabel() {
  const music = useMusicStore((s) => s.music);
  const frame = useCognitiveStore((s) => s.frame);
  return (
    <div className="absolute top-3 right-4 z-10 text-right">
      {music && (
        <div className="text-white/50 font-mono text-[9px] uppercase tracking-widest">
          {music.key} {music.scale} · {music.tempo} BPM
        </div>
      )}
      {frame && (
        <div className="text-white/25 font-mono text-[8px] mt-0.5">
          ƒ {Math.round(frame.focus * 100)}% · σ {Math.round(frame.stress * 100)}%
        </div>
      )}
    </div>
  );
}
