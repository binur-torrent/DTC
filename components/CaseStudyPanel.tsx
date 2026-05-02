"use client";

import { useCognitiveStore } from "@/lib/cognitiveStore";
import { useState } from "react";

const STUDIES = [
  { id: "POSITIVE", label: "Positive Emotion (Case #04)", desc: "Subject viewing pleasant imagery" },
  { id: "NEGATIVE", label: "Negative Emotion (Case #09)", desc: "Subject viewing distressing imagery" },
  { id: "NEUTRAL",  label: "Neutral State (Baseline)", desc: "Subject in relaxed resting state" },
];

export function CaseStudyPanel() {
  const sendMessage = useCognitiveStore((s) => s.sendMessage);
  const currentFrame = useCognitiveStore((s) => s.frame);
  const [activeStudy, setActiveStudy] = useState<string>("SIM");

  const selectStudy = (studyId: string) => {
    setActiveStudy(studyId);
    if (studyId === "SIM") {
      sendMessage({ type: "set_mode", mode: "sim" });
    } else {
      sendMessage({ type: "set_mode", mode: "dataset", label: studyId });
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col p-6 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Clinical Case Studies</h2>
        <p className="text-xs text-gray-500">Dataset: Jordan Bird Emotion EEG (2019)</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => selectStudy("SIM")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeStudy === "SIM"
              ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
              : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
        >
          <div className="font-medium text-sm text-gray-900">Live Simulation</div>
          <div className="text-xs text-gray-500 mt-1">Rule-based neuro-generative model</div>
        </button>

        <div className="h-px bg-gray-100 my-2" />

        {STUDIES.map((study) => (
          <button
            key={study.id}
            onClick={() => selectStudy(study.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeStudy === study.id
                ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <div className="font-medium text-sm text-gray-900">{study.label}</div>
            <div className="text-xs text-gray-500 mt-1">{study.desc}</div>
          </button>
        ))}
      </div>

      {activeStudy !== "SIM" && currentFrame && (
        <div className="mt-auto pt-8">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Study Metadata</div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">Label</span>
              <span className="text-xs font-mono font-bold text-teal-600">{currentFrame.datasetLabel}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">Sample Rate</span>
              <span className="text-xs font-mono text-gray-700">128Hz (downsampled)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Electrode Count</span>
              <span className="text-xs font-mono text-gray-700">14 (Muse/Emotiv)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
