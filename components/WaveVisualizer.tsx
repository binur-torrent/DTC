"use client";

import { useEffect, useRef } from "react";
import { useCognitiveStore } from "@/lib/cognitiveStore";

export function WaveVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Smoothing targets for fluid transitions
    let currentFocus = 0.5;
    let currentStress = 0.5;
    let currentTheta = 0.5;
    const spectrumBars = Array(50).fill(0);

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };
    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Get latest state
      const frame = useCognitiveStore.getState().frame;
      const targetFocus = frame?.focus || 0.5;
      const targetStress = frame?.stress || 0.5;
      const targetTheta = frame ? (frame.theta / (frame.alpha + frame.beta + frame.theta)) : 0.5;

      // Smooth state transitions
      currentFocus += (targetFocus - currentFocus) * 0.05;
      currentStress += (targetStress - currentStress) * 0.05;
      currentTheta += (targetTheta - currentTheta) * 0.05;

      // Clear with dark trail effect
      ctx.fillStyle = "rgba(10, 15, 24, 0.3)";
      ctx.fillRect(0, 0, width, height);

      const centerY = height * 0.45;

      // Wave 1: Cyan (Focus)
      // High focus = tighter, higher amplitude waves
      const freq1 = 0.01 + currentFocus * 0.02;
      const amp1 = 50 + currentFocus * 150;
      const speed1 = 0.02 + currentFocus * 0.03;

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let x = 0; x < width; x += 2) {
        const y = centerY + Math.sin(x * freq1 + time * speed1) * amp1;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#00d8ff"; // Neon cyan
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00d8ff";
      ctx.stroke();

      // Wave 2: White (Stress)
      // High stress = faster, chaotic, slightly offset
      const freq2 = 0.005 + currentStress * 0.03;
      const amp2 = 40 + currentStress * 120;
      const speed2 = 0.01 + currentStress * 0.08;

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let x = 0; x < width; x += 2) {
        const y = centerY + Math.cos(x * freq2 - time * speed2) * amp2;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ffffff";
      ctx.stroke();

      // Reset shadow for bars
      ctx.shadowBlur = 0;

      // Draw FFT Spectrum at the bottom
      const barCount = 50;
      const barWidth = (width / barCount) * 0.6;
      const barSpacing = (width / barCount) * 0.4;
      const maxBarHeight = height * 0.25;

      for (let i = 0; i < barCount; i++) {
        // Generate pseudo-FFT based on cognitive bands
        // Lower indices = theta/alpha, Higher indices = beta/gamma
        let targetHeight = 10;
        
        if (i < 15) {
           // Low frequencies (Theta/Alpha)
           targetHeight = 20 + currentTheta * maxBarHeight * Math.random();
        } else if (i < 35) {
           // Mid frequencies (Alpha/Beta)
           targetHeight = 20 + currentFocus * maxBarHeight * Math.random();
        } else {
           // High frequencies (Gamma/Stress)
           targetHeight = 10 + currentStress * maxBarHeight * Math.random();
        }

        // Smooth bars
        spectrumBars[i] += (targetHeight - spectrumBars[i]) * 0.15;

        const x = i * (barWidth + barSpacing) + barSpacing / 2;
        const y = height - spectrumBars[i];

        ctx.fillStyle = "#00a8cc"; // slightly darker cyan for bars
        ctx.fillRect(x, y, barWidth, spectrumBars[i]);
      }

      time += 1;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="flex flex-col h-[300px] w-full bg-[#0a0f18] relative rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-white/80 font-bold tracking-widest text-[10px] uppercase flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Neural Waveform
        </h2>
      </div>
      
      <div className="absolute top-4 right-4 z-10 flex gap-4 text-right">
        <div>
          <div className="text-white/40 text-[8px] uppercase font-bold">Focus</div>
          <div className="text-cyan-400 font-mono text-sm font-bold">
             {((useCognitiveStore.getState().frame?.focus || 0) * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-white/40 text-[8px] uppercase font-bold">Stress</div>
          <div className="text-white font-mono text-sm font-bold">
             {((useCognitiveStore.getState().frame?.stress || 0) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="flex-1 w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
    </div>
  );
}
