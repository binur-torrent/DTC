"use client";

import { useCognitiveStore } from "@/lib/cognitiveStore";
import { useMusicStore } from "@/lib/musicStore";
import { useComposer } from "@/lib/useComposer";
import { AudioSpectrum } from "./AudioSpectrum";

export function MusicPanel() {
  useComposer();
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const music = useMusicStore((s) => s.music);
  const source = useMusicStore((s) => s.source);
  const activeChord = useMusicStore((s) => s.activeChordIndex);
  const togglePlayback = useMusicStore((s) => s.togglePlayback);

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 min-h-0 overflow-y-auto">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            AI Music Composer
          </h2>
          <button
            onClick={togglePlayback}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
              isPlaying
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-teal-100 text-teal-700 hover:bg-teal-200"
            }`}
          >
            {isPlaying ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </>
            )}
          </button>
        </div>
      </div>

      {/* Source Badge */}
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            source === "ai"
              ? "bg-purple-100 text-purple-600"
              : source === "fallback"
              ? "bg-yellow-100 text-yellow-600"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {source === "ai" ? "🤖 AI Generated" : source === "fallback" ? "📋 Fallback" : "Waiting..."}
        </span>
        {isPlaying && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-gray-400 font-medium">LIVE</span>
          </span>
        )}
      </div>

      {/* Real audio spectrum — reads directly from Web Audio AnalyserNode */}
      <AudioSpectrum />

      {!music ? (
        <div className="flex items-center justify-center text-gray-400 text-sm py-6">
          {isPlaying ? "Waiting for AI response…" : "Press Play to start the AI music composer"}
        </div>
      ) : (
        <>
          {/* Key & Scale */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-gray-400 font-bold mb-1">Key</span>
                <span className="text-2xl font-bold text-gray-800">{music.key}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-gray-400 font-bold mb-1">Scale</span>
                <span className="text-lg font-semibold text-gray-600 capitalize">{music.scale}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-gray-400 font-bold mb-1">Tempo</span>
                <span className="text-lg font-mono font-bold text-gray-700">{music.tempo} <span className="text-xs text-gray-400">BPM</span></span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-gray-400 font-bold mb-1">Voice</span>
                <span className="text-sm font-semibold text-gray-600 capitalize">{music.instrument}</span>
              </div>
            </div>
          </div>

          {/* Chord Progression */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <span className="text-[10px] uppercase text-gray-400 font-bold block mb-3">
              Chord Progression
            </span>
            <div className="flex gap-2">
              {music.chords.map((chord, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
                    i === activeChord && isPlaying
                      ? "bg-teal-500 text-white shadow-lg shadow-teal-200 scale-105"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {chord}
                </div>
              ))}
            </div>
          </div>

          {/* Intensity Meter */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <span className="text-[10px] uppercase text-gray-400 font-bold block mb-2">
              Intensity
            </span>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${(music.intensity * 100).toFixed(0)}%`,
                  background: `linear-gradient(90deg, #2dd4bf ${0}%, ${
                    music.intensity > 0.6 ? "#f59e0b" : "#14b8a6"
                  } ${50}%, ${music.intensity > 0.8 ? "#ef4444" : "#06b6d4"} 100%)`,
                }}
              />
            </div>
            <span className="text-xs text-gray-500 mt-1 block">
              {(music.intensity * 100).toFixed(0)}%
            </span>
          </div>

          {/* AI Description */}
          <div className="bg-gradient-to-r from-purple-50 to-teal-50 border border-purple-100 rounded-xl p-4">
            <span className="text-[10px] uppercase text-purple-400 font-bold block mb-1">
              AI Musical Interpretation
            </span>
            <p className="text-sm text-gray-700 italic">&ldquo;{music.description}&rdquo;</p>
          </div>
        </>
      )}
    </div>
  );
}
