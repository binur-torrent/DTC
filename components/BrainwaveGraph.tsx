"use client";

import { useEffect, useRef } from "react";
import { useCognitiveStore } from "@/lib/cognitiveStore";

const COLOR_ALPHA = "rgba(34, 211, 238, 0.95)";   // cyan
const COLOR_BETA  = "rgba(232, 121, 249, 0.95)";  // magenta
const COLOR_THETA = "rgba(251, 191, 36, 0.95)";   // amber
const GRID = "rgba(99, 102, 241, 0.08)";

export function BrainwaveGraph() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const history = useCognitiveStore.getState().history;

      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      for (let i = 1; i < 6; i++) {
        const x = (w / 6) * i;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      if (history.length >= 2) {
        const n = history.length;
        const step = w / Math.max(1, n - 1);

        const drawLine = (key: "alpha" | "beta" | "theta", color: string) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.6 * dpr;
          ctx.shadowBlur = 8 * dpr;
          ctx.shadowColor = color;
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const v = history[i][key];
            const x = i * step;
            const y = h - v * h * 0.92 - h * 0.04;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        };

        drawLine("theta", COLOR_THETA);
        drawLine("alpha", COLOR_ALPHA);
        drawLine("beta", COLOR_BETA);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="panel relative w-full h-full overflow-hidden">
      <span className="corner-bracket tl" />
      <span className="corner-bracket tr" />
      <span className="corner-bracket bl" />
      <span className="corner-bracket br" />

      <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        <span className="label-mono">BRAINWAVE STREAM // 6.0s</span>
        <div className="flex gap-4 label-mono">
          <span><span className="inline-block w-2 h-2 mr-1.5 align-middle bg-neural-cyan rounded-full" style={{ boxShadow: "0 0 8px rgba(34,211,238,0.7)" }} />α ALPHA</span>
          <span><span className="inline-block w-2 h-2 mr-1.5 align-middle bg-neural-magenta rounded-full" style={{ boxShadow: "0 0 8px rgba(232,121,249,0.7)" }} />β BETA</span>
          <span><span className="inline-block w-2 h-2 mr-1.5 align-middle bg-neural-amber rounded-full" style={{ boxShadow: "0 0 8px rgba(251,191,36,0.7)" }} />θ THETA</span>
        </div>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
