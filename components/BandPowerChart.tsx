"use client";

import { useEffect, useRef } from "react";
import { useCognitiveStore } from "@/lib/cognitiveStore";
import type { DisplayParams } from "./ParameterPanel";

const BANDS = [
  { label: "Delta", range: "(1-4Hz)", key: "delta" as const },
  { label: "Theta", range: "(4-8Hz)", key: "theta" as const },
  { label: "Alpha", range: "(8-12Hz)", key: "alpha" as const },
  { label: "Beta",  range: "(12-25Hz)", key: "beta" as const },
  { label: "Gamma", range: "(25-45Hz)", key: "gamma" as const },
];

interface Props {
  params: DisplayParams;
}

export function BandPowerChart({ params }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  // Smoothed bar heights for animation
  const smoothed = useRef<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const W = rect.width * devicePixelRatio;
      const H = rect.height * devicePixelRatio;
      canvas.width = W;
      canvas.height = H;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      const w = rect.width;
      const h = rect.height;

      const { pmin, pmax } = params;
      const padL = 50, padR = 20, padT = 30, padB = 45;
      const cw = w - padL - padR;
      const ch = h - padT - padB;

      // Clear
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);

      // Get current data
      const frame = useCognitiveStore.getState().frame;

      // Target band powers (scaled to reasonable dB-like values)
      const targets = [
        (frame?.delta ?? 0) * 45,
        (frame?.theta ?? 0) * 40,
        (frame?.alpha ?? 0) * 45,
        (frame?.beta ?? 0) * 35,
        (frame?.gamma ?? 0) * 30,
      ];

      // Smooth towards targets
      for (let i = 0; i < 5; i++) {
        smoothed.current[i] += (targets[i] - smoothed.current[i]) * 0.08;
      }

      // Y grid + labels
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = 0.5;
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const y = padT + (ch / yTicks) * i;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + cw, y);
        ctx.stroke();
        const val = pmax - (pmax - pmin) * (i / yTicks);
        ctx.fillStyle = "#999";
        ctx.font = "10px system-ui";
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(2), padL - 8, y + 3);
      }

      // Title
      ctx.fillStyle = "#555";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("Band power", padL, 18);

      // Channel indicator
      ctx.fillStyle = "#888";
      ctx.font = "11px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("● AF3", padL + 100, 18);

      // Draw bars
      const barCount = 5;
      const barGap = cw * 0.12;
      const totalGaps = barGap * (barCount + 1);
      const barWidth = (cw - totalGaps) / barCount;

      for (let i = 0; i < barCount; i++) {
        const x = padL + barGap + i * (barWidth + barGap);
        const val = smoothed.current[i];
        const normalized = Math.max(0, Math.min(1, (val - pmin) / (pmax - pmin)));
        const barH = normalized * ch;
        const y = padT + ch - barH;

        // Bar
        ctx.fillStyle = "#555";
        ctx.fillRect(x, y, barWidth, barH);

        // Label
        ctx.fillStyle = "#555";
        ctx.font = "bold 10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(BANDS[i].label, x + barWidth / 2, padT + ch + 15);

        ctx.fillStyle = "#999";
        ctx.font = "9px system-ui";
        ctx.fillText(BANDS[i].range, x + barWidth / 2, padT + ch + 28);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [params]);

  return (
    <div className="flex-[4] bg-white rounded-lg border border-gray-200 overflow-hidden min-h-0">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
