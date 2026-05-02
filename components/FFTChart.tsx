"use client";

import { useEffect, useRef } from "react";
import { useCognitiveStore } from "@/lib/cognitiveStore";

/**
 * Generates a synthetic FFT spectrum from alpha/beta/theta values.
 * Uses a 1/f baseline with peaks in each band to look realistic.
 */
function generateSpectrum(
  alpha: number, beta: number, theta: number,
  fmin: number, fmax: number, numPoints: number
): number[] {
  const out: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    const freq = fmin + (fmax - fmin) * (i / (numPoints - 1));
    // 1/f baseline: high power at low frequencies, drops off
    let power = 50 - freq * 0.6 - (freq * freq) * 0.003;

    // Add band-specific peaks based on current cognitive state
    // Theta (4-8 Hz)
    if (freq >= 3 && freq <= 9) {
      const center = 6;
      const dist = Math.abs(freq - center);
      power += theta * 25 * Math.exp(-dist * dist * 0.15);
    }
    // Alpha (8-12 Hz)
    if (freq >= 7 && freq <= 14) {
      const center = 10;
      const dist = Math.abs(freq - center);
      power += alpha * 35 * Math.exp(-dist * dist * 0.12);
    }
    // Low Beta (12-16 Hz)
    if (freq >= 11 && freq <= 18) {
      const center = 14;
      const dist = Math.abs(freq - center);
      power += beta * 20 * Math.exp(-dist * dist * 0.1);
    }
    // High Beta (16-25 Hz)
    if (freq >= 15 && freq <= 27) {
      const center = 20;
      const dist = Math.abs(freq - center);
      power += beta * 15 * Math.exp(-dist * dist * 0.04);
    }
    // Gamma (25-45 Hz)
    if (freq >= 24 && freq <= 46) {
      power += 3;
    }

    // Small noise for realism
    power += (Math.random() - 0.5) * 2;
    out.push(power);
  }
  return out;
}

interface Props {
  params: DisplayParams;
}

export function FFTChart({ params }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

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

      const { fmin, fmax, amin, amax } = params;
      const padL = 50, padR = 20, padT = 30, padB = 30;
      const cw = w - padL - padR;
      const ch = h - padT - padB;

      // Clear
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = 0.5;
      const yTicks = 6;
      for (let i = 0; i <= yTicks; i++) {
        const y = padT + (ch / yTicks) * i;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + cw, y);
        ctx.stroke();
      }
      const xTicks = 8;
      for (let i = 0; i <= xTicks; i++) {
        const x = padL + (cw / xTicks) * i;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + ch);
        ctx.stroke();
        // X labels
        ctx.fillStyle = "#999";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        const freq = fmin + (fmax - fmin) * (i / xTicks);
        ctx.fillText(freq.toFixed(0), x, padT + ch + 15);
      }
      // Y labels
      for (let i = 0; i <= yTicks; i++) {
        const y = padT + (ch / yTicks) * i;
        const val = amax - (amax - amin) * (i / yTicks);
        ctx.fillStyle = "#999";
        ctx.font = "10px system-ui";
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(0), padL - 8, y + 3);
      }

      // Title
      ctx.fillStyle = "#555";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("FFT", padL, 18);

      // Y-axis label
      ctx.fillStyle = "#999";
      ctx.font = "10px system-ui";
      ctx.fillText("[dB]", padL - 35, padT + 3);

      // "Window: Hanning" and "Channel" labels
      ctx.fillStyle = "#888";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText("Window: Hanning", w - padR - 100, 18);
      ctx.fillText("Channel", w - padR, 18);

      // Channel indicator
      ctx.fillStyle = "#888";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText("● AF3", padL + cw, padT + ch + 26);

      // ── Gate: freeze at flat baseline when session not started ──
      const sessionStartTime = useCognitiveStore.getState().sessionStartTime;

      // Get current frame data
      const frame = sessionStartTime ? useCognitiveStore.getState().frame : null;
      const alpha = frame?.alpha ?? 0;
      const beta = frame?.beta ?? 0;
      const theta = frame?.theta ?? 0;

      // Generate or use real spectrum (flat line if no session)
      let spectrum: number[];
      let numPoints = 256;

      if (!sessionStartTime) {
        // Flat neutral line at mid-level
        const midVal = amin + (amax - amin) * 0.15;
        spectrum = Array(numPoints).fill(midVal);
      } else if (frame?.fft && frame.fft.length > 0) {
        spectrum = frame.fft.map(v => amin + v * (amax - amin) * 0.8 + 10);
        numPoints = spectrum.length;
      } else {
        spectrum = generateSpectrum(alpha, beta, theta, fmin, fmax, numPoints);
      }

      ctx.strokeStyle = (sessionStartTime && frame?.fft) ? "#14b8a6" : "#bbb";
      ctx.lineWidth = sessionStartTime ? 1.2 : 1;
      ctx.beginPath();
      for (let i = 0; i < numPoints; i++) {
        const x = padL + (i / (numPoints - 1)) * cw;
        const normalized = (spectrum[i] - amin) / (amax - amin);
        const y = padT + ch - normalized * ch;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [params]);

  return (
    <div className="flex-[6] bg-white rounded-lg border border-gray-200 overflow-hidden min-h-0">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
