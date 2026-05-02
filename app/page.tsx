"use client";

import { useState, useCallback } from "react";
import { useCognitiveStream } from "@/lib/useCognitiveStream";
import { Sidebar, type ViewId } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ParameterPanel, type DisplayParams } from "@/components/ParameterPanel";
import { HardwareStatus } from "@/components/HardwareStatus";
import { CaseStudyPanel } from "@/components/CaseStudyPanel";
import { MusicPanel } from "@/components/MusicPanel";
import { WaveVisualizer } from "@/components/WaveVisualizer";
import { FFTChart } from "@/components/FFTChart";
import { BandPowerChart } from "@/components/BandPowerChart";
import { useCognitiveStore } from "@/lib/cognitiveStore";

const DEFAULT_PARAMS: DisplayParams = {
  amax: 80, amin: -65, fmax: 64, fmin: 0,
  length: 256, step: 23, pmax: 50, pmin: 0,
};

export default function Home() {
  useCognitiveStream();
  const [activeView, setActiveView] = useState<ViewId>("signals");
  const [params, setParams] = useState<DisplayParams>(DEFAULT_PARAMS);
  const status = useCognitiveStore((s) => s.status);

  const handleChange = useCallback((key: keyof DisplayParams, delta: number) => {
    setParams((p) => ({ ...p, [key]: p[key] + delta }));
  }, []);

  const handleAutoscale = useCallback(() => {
    setParams(DEFAULT_PARAMS);
  }, []);

  return (
    <main className="flex h-screen bg-gray-50">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <div className="flex flex-1 min-h-0">
          {status !== "connected" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Simulator Not Found</h2>
              <p className="text-sm text-gray-400 mb-6">You need to connect the simulator first to receive brainwave data.</p>
              <button 
                onClick={() => useCognitiveStore.getState().setConnectEnabled(true)}
                className="px-6 py-3 bg-teal-500 text-white rounded-xl font-bold shadow-md hover:bg-teal-600 transition-colors"
              >
                Connect Simulator
              </button>
            </div>
          ) : (
            <>
              {/* ── Signals View: Live Simulation ── */}
          {activeView === "signals" && (
            <>
              <ParameterPanel params={params} onChange={handleChange} onAutoscale={handleAutoscale} />
              <div className="flex flex-col flex-1 p-4 gap-4 min-h-0">
                <FFTChart params={params} />
                <BandPowerChart params={params} />
              </div>
            </>
          )}

          {/* ── Music View: AI Composer ── */}
          {activeView === "music" && <MusicPanel />}

          {/* ── Immersive View: Wave Oscilloscope ── */}
          {activeView === "immersive" && <WaveVisualizer />}

          {/* ── Subject View: Clinical Case Studies ── */}
          {activeView === "subject" && (
            <>
              <CaseStudyPanel />
              <div className="flex flex-col flex-1 p-4 gap-4 min-h-0">
                <FFTChart params={params} />
                <BandPowerChart params={params} />
              </div>
            </>
          )}

          {/* ── Hardware View: Electrode Map + Device Info ── */}
          {activeView === "hardware" && <HardwareStatus />}

          {/* ── Placeholder for other views ── */}
          {activeView !== "signals" && activeView !== "hardware" && activeView !== "music" && activeView !== "subject" && activeView !== "immersive" && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {activeView.charAt(0).toUpperCase() + activeView.slice(1)} view — coming soon
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
