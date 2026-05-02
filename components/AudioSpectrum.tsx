"use client";

import { useEffect, useRef } from "react";
import { getAudioEngine } from "@/lib/audioEngine";

/**
 * AudioSpectrum — reads real frequency data from the Web Audio AnalyserNode
 * and draws a simple bar spectrum. No math tricks, no fake data. 
 * If nothing is playing the bars are flat/silent.
 */
export function AudioSpectrum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const smoothed: number[] = new Array(64).fill(0);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = parent.clientWidth  * dpr;
      canvas.height = parent.clientHeight * dpr;
    };
    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width  / dpr;
      const H = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // ── Background ──
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, W, H);

      // ── Read real audio data ──
      const analyser = getAudioEngine().getAnalyser();
      const BAR_COUNT = 48;
      let freqData = new Uint8Array(BAR_COUNT);

      if (analyser) {
        const full = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(full);
        // Downsample to BAR_COUNT buckets
        const step = Math.floor(full.length / BAR_COUNT);
        for (let i = 0; i < BAR_COUNT; i++) {
          freqData[i] = full[i * step];
        }
      }
      // If no analyser, freqData stays all-zero → bars are silent/flat

      // ── Smooth bars ──
      for (let i = 0; i < BAR_COUNT; i++) {
        smoothed[i] += (freqData[i] / 255 - smoothed[i]) * 0.25;
      }

      // ── Draw bars ──
      const padX  = 16;
      const padY  = 14;
      const gap   = 2;
      const barW  = (W - padX * 2 - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      const maxH  = H - padY * 2;

      for (let i = 0; i < BAR_COUNT; i++) {
        const v  = smoothed[i];
        const bH = Math.max(2, v * maxH);
        const x  = padX + i * (barW + gap);
        const y  = H - padY - bH;

        // Color: cool teal at low levels → bright cyan at peaks
        const brightness = 120 + Math.round(v * 135);
        const alpha = 0.4 + v * 0.6;
        ctx.fillStyle = `rgba(0, ${brightness}, ${200 + Math.round(v * 55)}, ${alpha.toFixed(2)})`;
        ctx.fillRect(x, y, barW, bH);

        // Thin highlight on top
        ctx.fillStyle = `rgba(200, 255, 255, ${(v * 0.5).toFixed(2)})`;
        ctx.fillRect(x, y, barW, 1.5);
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
      className="w-full bg-[#0a0a14] rounded-xl border border-white/10 overflow-hidden shadow-md relative"
      style={{ height: 140 }}
    >
      <div className="absolute top-2.5 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-white/35 font-mono text-[9px] uppercase tracking-widest">
          Audio Spectrum // Live
        </span>
      </div>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
