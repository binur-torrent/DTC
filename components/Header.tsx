"use client";

import { useCognitiveStore } from "@/lib/cognitiveStore";

export function Header() {
  const status = useCognitiveStore((s) => s.status);
  const frame = useCognitiveStore((s) => s.frame);

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case "focused": return "text-blue-500 bg-blue-50";
      case "calm": return "text-teal-500 bg-teal-50";
      case "overloaded": return "text-red-500 bg-red-50";
      case "drifting": return "text-purple-500 bg-purple-50";
      default: return "text-gray-500 bg-gray-50";
    }
  };

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold text-gray-700 tracking-wide">
          WAVY<span className="text-teal-400 font-bold">PRO</span>
        </span>

        {status === "connected" && frame && (
          <div className="flex items-center gap-4 border-l pl-6 border-gray-100">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-gray-400 font-bold leading-none mb-1">Focus</span>
              <span className="text-xs font-mono font-bold text-gray-700">{(frame.focus * 100).toFixed(0)}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-gray-400 font-bold leading-none mb-1">Stress</span>
              <span className="text-xs font-mono font-bold text-gray-700">{(frame.stress * 100).toFixed(0)}%</span>
            </div>
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getMoodColor(frame.mood)}`}>
              {frame.mood}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${
          status === "connected" ? "bg-green-500" :
          status === "connecting" ? "bg-yellow-400" : "bg-red-400"
        }`} />
        <span className="text-sm font-medium text-gray-600">EMOTIV EPOC X</span>
        <div className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
          status === "connected" ? "border-green-100 bg-green-50 text-green-600" : "border-red-100 bg-red-50 text-red-600"
        }`}>
          {status === "connected" ? "LIVE DATA" : "OFFLINE"}
        </div>
      </div>
    </header>
  );
}
