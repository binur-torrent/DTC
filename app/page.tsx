"use client";

import { useState, useCallback } from "react";
import { useCognitiveStream } from "@/lib/useCognitiveStream";
import { Sidebar, type ViewId } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ParameterPanel, type DisplayParams } from "@/components/ParameterPanel";
import { FFTChart } from "@/components/FFTChart";
import { BandPowerChart } from "@/components/BandPowerChart";
import { HardwareStatus } from "@/components/HardwareStatus";
import { CaseStudyPanel } from "@/components/CaseStudyPanel";

const DEFAULT_PARAMS: DisplayParams = {
  amax: 80, amin: -65, fmax: 64, fmin: 0,
  length: 256, step: 23, pmax: 50, pmin: 0,
};

export default function Home() {
  useCognitiveStream();
  const [activeView, setActiveView] = useState<ViewId>("signals");
  const [params, setParams] = useState<DisplayParams>(DEFAULT_PARAMS);

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
          {activeView !== "signals" && activeView !== "hardware" && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {activeView.charAt(0).toUpperCase() + activeView.slice(1)} view — coming soon
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
