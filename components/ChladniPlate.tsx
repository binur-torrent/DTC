"use client";

import { useEffect, useRef } from "react";
import { useCognitiveStore } from "@/lib/cognitiveStore";
import { useMusicStore } from "@/lib/musicStore";

// Maps musical keys to base frequency modes (n, m pairs for Chladni formula)
// sin(n*pi*x)*cos(m*pi*y) - cos(n*pi*x)*sin(m*pi*y) = 0
const KEY_TO_MODE: Record<string, [number, number]> = {
  C:   [2, 3],
  D:   [3, 4],
  E:   [4, 5],
  F:   [2, 5],
  G:   [3, 5],
  A:   [4, 6],
  B:   [5, 6],
  "C#":[3, 7],
  "F#":[2, 7],
  "Bb":[4, 7],
};

// Scale types shift the secondary mode, creating different symmetry
const SCALE_TO_MODE_OFFSET: Record<string, [number, number]> = {
  major:   [0, 0],
  minor:   [1, 0],
  dorian:  [0, 1],
  phrygian:[1, 1],
  lydian:  [2, 0],
  mixolydian:[0, 2],
  locrian: [1, 2],
};

// Color palettes per mood/state
function getMoodColors(stress: number, focus: number, calmness: number) {
  if (stress > 0.65) {
    // High stress: warm reds/ambers
    return { sand: `rgba(255, ${120 + Math.floor(focus * 80)}, 30,`, glow: "#ff6a00", bg: "rgba(20, 8, 4, 0.92)" };
  } else if (focus > 0.65) {
    // High focus: bright electric blues
    return { sand: `rgba(50, 160, 255,`, glow: "#4aabff", bg: "rgba(4, 8, 24, 0.92)" };
  } else if (calmness > 0.55) {
    // Calm: cool teals/aquas
    return { sand: `rgba(30, 210, 180,`, glow: "#00d8b0", bg: "rgba(4, 18, 16, 0.92)" };
  } else {
    // Neutral: soft white/silver
    return { sand: `rgba(210, 220, 240,`, glow: "#c0ccee", bg: "rgba(10, 10, 18, 0.92)" };
  }
}

export function ChladniPlate() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    // Particle system: each particle has a position and velocity
    const PARTICLE_COUNT = 6000;
    const particles: { x: number; y: number; vx: number; vy: number }[] = [];

    const W = () => canvas.width / window.devicePixelRatio;
    const H = () => canvas.height / window.devicePixelRatio;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        // Re-scatter particles on resize
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          particles[i] = {
            x: Math.random() * W(),
            y: Math.random() * H(),
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
          };
        }
      }
    };

    // Initial particle placement
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * 400,
        y: Math.random() * 200,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      });
    }

    window.addEventListener("resize", resize);
    resize();

    // Smooth interpolation state
    let curN = 2, curM = 3;
    let targetN = 2, targetM = 3;
    let phase = 0;
    let curIntensity = 0.3;
    let curStress = 0.3;
    let curFocus = 0.4;
    let curCalmness = 0.5;

    const draw = () => {
      const w = W();
      const h = H();

      // ── Read live data ──
      const music = useMusicStore.getState().music;
      const frame = useCognitiveStore.getState().frame;
      const isPlaying = useMusicStore.getState().isPlaying;

      const targetIntensity = music?.intensity ?? (frame ? (frame.focus * 0.4 + frame.stress * 0.3) : 0.3);
      const targetStress = frame?.stress ?? 0.3;
      const targetFocus = frame?.focus ?? 0.4;
      const targetCalmness = frame?.calmness ?? 0.5;
      const tempo = music?.tempo ?? (frame ? 60 + frame.focus * 40 : 72);

      // ── Derive Chladni modes from key/scale, or from brainwaves if no music yet ──
      const key = music?.key ?? "C";
      const scale = music?.scale ?? (targetStress > 0.5 ? "minor" : "major");
      const baseMode = KEY_TO_MODE[key] ?? [2, 3];
      const scaleOffset = SCALE_TO_MODE_OFFSET[scale.toLowerCase()] ?? [0, 0];
      targetN = baseMode[0] + scaleOffset[0];
      targetM = baseMode[1] + scaleOffset[1];

      // ── Smooth all values ──
      curN += (targetN - curN) * 0.008;
      curM += (targetM - curM) * 0.008;
      curIntensity += (targetIntensity - curIntensity) * 0.04;
      curStress += (targetStress - curStress) * 0.03;
      curFocus += (targetFocus - curFocus) * 0.03;
      curCalmness += (targetCalmness - curCalmness) * 0.03;

      // Phase advances at a speed tied to tempo
      const phaseSpeed = isPlaying ? (tempo / 60) * 0.015 : 0.005;
      phase += phaseSpeed;

      // ── Colors from mood ──
      const colors = getMoodColors(curStress, curFocus, curCalmness);

      // ── Clear canvas ──
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, w, h);

      // ── Chladni function value at a given point ──
      // z(x,y) = sin(n*π*x)*cos(m*π*y) - cos(n*π*x)*sin(m*π*y)
      // Particles move TOWARD where z ≈ 0 (the nodal lines)
      const evalZ = (px: number, py: number) => {
        const nx = px / w;
        const ny = py / h;
        return (
          Math.sin(curN * Math.PI * nx + phase * 0.3) * Math.cos(curM * Math.PI * ny) -
          Math.cos(curN * Math.PI * nx) * Math.sin(curM * Math.PI * ny + phase * 0.2)
        );
      };

      // Vibration amplitude: drives how violently particles move
      const amplitude = 0.4 + curIntensity * 3.0 + (isPlaying ? 0.5 : 0);
      const STEP = 2; // gradient sample distance in pixels

      for (const p of particles) {
        // Numerical gradient of z — particles are pushed perpendicular to it
        const z  = evalZ(p.x, p.y);
        const zdx = evalZ(p.x + STEP, p.y) - z;
        const zdy = evalZ(p.x, p.y + STEP) - z;

        // Force pushes particle toward nodal line (z=0)
        const force = z * amplitude;
        p.vx -= force * zdx;
        p.vy -= force * zdy;

        // Slight random jitter (thermal noise), scaled to intensity
        p.vx += (Math.random() - 0.5) * 0.08 * (1 + curIntensity);
        p.vy += (Math.random() - 0.5) * 0.08 * (1 + curIntensity);

        // Damping: keeps system stable
        const damping = isPlaying ? 0.88 : 0.82;
        p.vx *= damping;
        p.vy *= damping;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x += w;
        if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        if (p.y > h) p.y -= h;

        // Opacity based on how close to nodal line (|z| small = brighter)
        const closeness = 1 - Math.min(1, Math.abs(z) * 3);
        const opacity = 0.1 + closeness * 0.85;

        ctx.fillStyle = `${colors.sand}${opacity})`;
        ctx.fillRect(p.x, p.y, 1.2, 1.2);
      }

      // ── Glowing border when playing ──
      if (isPlaying) {
        ctx.strokeStyle = colors.glow;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.25 + curIntensity * 0.4;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        ctx.globalAlpha = 1;
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
    <div className="flex flex-col w-full bg-[#0a0a12] relative rounded-xl border border-white/10 overflow-hidden shadow-lg" style={{ height: 260 }}>
      {/* Label */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        <span className="text-white/50 font-mono text-[9px] uppercase tracking-widest">Cymatics // Chladni Plate</span>
      </div>

      {/* Key label */}
      <KeyLabel />

      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

// Separate reactive component so the canvas useEffect isn't re-triggered by state changes
function KeyLabel() {
  const music = useMusicStore((s) => s.music);
  const frame = useCognitiveStore((s) => s.frame);

  return (
    <div className="absolute top-3 right-4 z-10 text-right">
      {music && (
        <div className="text-white/60 font-mono text-[9px] uppercase tracking-widest">
          {music.key} {music.scale} · {music.tempo} BPM
        </div>
      )}
      {frame && (
        <div className="text-white/30 font-mono text-[8px] mt-0.5">
          ƒ {Math.round(frame.focus * 100)}% · σ {Math.round(frame.stress * 100)}%
        </div>
      )}
    </div>
  );
}
