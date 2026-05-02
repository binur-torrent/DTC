"use client";

import { useCognitiveStore } from "@/lib/cognitiveStore";

/* ── EPOC X 14-channel electrode positions (10-20 system) ── */
const ELECTRODES: { id: string; x: number; y: number; quality: number }[] = [
  { id: "AF3", x: 72, y: 32, quality: 1 },
  { id: "AF4", x: 128, y: 32, quality: 1 },
  { id: "F7",  x: 38, y: 48, quality: 1 },
  { id: "F3",  x: 62, y: 52, quality: 1 },
  { id: "F4",  x: 138, y: 52, quality: 1 },
  { id: "F8",  x: 162, y: 48, quality: 1 },
  { id: "FC5", x: 46, y: 72, quality: 0.7 },
  { id: "FC6", x: 154, y: 72, quality: 1 },
  { id: "T7",  x: 28, y: 100, quality: 1 },
  { id: "T8",  x: 172, y: 100, quality: 1 },
  { id: "P7",  x: 42, y: 138, quality: 1 },
  { id: "P8",  x: 158, y: 138, quality: 1 },
  { id: "O1",  x: 78, y: 168, quality: 0.5 },
  { id: "O2",  x: 122, y: 168, quality: 1 },
];

function qualityColor(q: number): string {
  if (q >= 0.9) return "#22c55e";   // green
  if (q >= 0.6) return "#eab308";   // yellow
  return "#ef4444";                  // red
}

function qualityLabel(q: number): string {
  if (q >= 0.9) return "Good";
  if (q >= 0.6) return "Fair";
  return "Poor";
}

export function HardwareStatus() {
  const status = useCognitiveStore((s) => s.status);
  const connected = status === "connected";

  const goodCount = ELECTRODES.filter((e) => e.quality >= 0.9).length;
  const totalCount = ELECTRODES.length;

  return (
    <div className="flex-1 flex flex-col items-center bg-white p-6 gap-6 overflow-auto">
      {/* ── Device Info Card ── */}
      <div className="w-full max-w-md bg-gray-50 rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Device Status</h2>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            connected
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-600"
          }`}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-gray-500">Device</div>
          <div className="text-gray-800 font-medium">Emotiv EPOC X</div>
          <div className="text-gray-500">Channels</div>
          <div className="text-gray-800 font-medium">14 + 2 Reference</div>
          <div className="text-gray-500">Sample Rate</div>
          <div className="text-gray-800 font-medium">256 Hz</div>
          <div className="text-gray-500">Resolution</div>
          <div className="text-gray-800 font-medium">14-bit</div>
          <div className="text-gray-500">Battery</div>
          <div className="text-gray-800 font-medium">87%</div>
          <div className="text-gray-500">Firmware</div>
          <div className="text-gray-800 font-mono font-medium">v3.1.44</div>
        </div>
      </div>

      {/* ── Electrode Placement Map ── */}
      <div className="w-full max-w-md bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Electrode Contact Quality</h2>
        <p className="text-xs text-gray-400 mb-4">
          {goodCount}/{totalCount} channels — Signal quality: {goodCount >= 12 ? "Excellent" : goodCount >= 8 ? "Acceptable" : "Poor"}
        </p>

        <svg viewBox="0 0 200 200" className="w-full max-w-xs mx-auto">
          {/* Head outline */}
          <ellipse cx="100" cy="100" rx="80" ry="88" fill="none" stroke="#d1d5db" strokeWidth="1.5" />

          {/* Nose indicator (top = front of head) */}
          <path d="M93 14 L100 4 L107 14" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinejoin="round" />

          {/* Left ear */}
          <path d="M20 90 Q12 100 20 110" fill="none" stroke="#d1d5db" strokeWidth="1.5" />
          {/* Right ear */}
          <path d="M180 90 Q188 100 180 110" fill="none" stroke="#d1d5db" strokeWidth="1.5" />

          {/* Midline cross-hairs */}
          <line x1="100" y1="12" x2="100" y2="188" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 3" />
          <line x1="20" y1="100" x2="180" y2="100" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 3" />

          {/* Electrodes */}
          {ELECTRODES.map((e) => (
            <g key={e.id}>
              {/* Outer glow ring */}
              <circle cx={e.x} cy={e.y} r="9" fill={qualityColor(e.quality)} opacity="0.15" />
              {/* Electrode dot */}
              <circle cx={e.x} cy={e.y} r="5" fill={qualityColor(e.quality)} stroke="white" strokeWidth="1.5" />
              {/* Label */}
              <text
                x={e.x}
                y={e.y - 10}
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="600"
                fontFamily="system-ui"
                fill="#6b7280"
              >
                {e.id}
              </text>
            </g>
          ))}

          {/* CMS / DRL reference electrodes */}
          <circle cx="88" cy="100" r="3" fill="none" stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 2" />
          <text x="88" y="93" textAnchor="middle" fontSize="5.5" fill="#9ca3af" fontFamily="system-ui">CMS</text>
          <circle cx="112" cy="100" r="3" fill="none" stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 2" />
          <text x="112" y="93" textAnchor="middle" fontSize="5.5" fill="#9ca3af" fontFamily="system-ui">DRL</text>
        </svg>

        {/* Legend */}
        <div className="flex justify-center gap-5 mt-4 text-xs text-gray-500">
          {[
            { color: "#22c55e", label: "Good" },
            { color: "#eab308", label: "Fair" },
            { color: "#ef4444", label: "Poor" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Channel Detail Table ── */}
      <div className="w-full max-w-md bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Channel Impedance</h2>
        <div className="grid grid-cols-4 gap-2 text-xs">
          {ELECTRODES.map((e) => (
            <div key={e.id} className="flex items-center gap-1.5 py-1 px-2 bg-white rounded border border-gray-100">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: qualityColor(e.quality) }} />
              <span className="font-mono font-medium text-gray-700">{e.id}</span>
              <span className="ml-auto text-gray-400">{qualityLabel(e.quality)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
