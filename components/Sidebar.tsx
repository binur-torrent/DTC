"use client";

export type ViewId = "signals" | "hardware" | "music" | "analysis" | "subject" | "grid" | "settings";

const VIEWS: { id: ViewId; path: string; label: string }[] = [
  { id: "signals",  label: "Signals",  path: "M2 12h4l3-9 4 18 3-9h4" },
  { id: "music",    label: "Music",    path: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  { id: "hardware", label: "Hardware", path: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v12M6 12h12" },
  { id: "analysis", label: "Analysis", path: "M3 3h18v18H3zM3 15l5-5 4 4 8-8" },
  { id: "subject",  label: "Subject",  path: "M12 11a4 4 0 100-8 4 4 0 000 8zM5.5 21a6.5 6.5 0 0113 0" },
  { id: "grid",     label: "Grid",     path: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { id: "settings", label: "Settings", path: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" },
];

interface Props {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
}

export function Sidebar({ activeView, onViewChange }: Props) {
  return (
    <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center pt-4 gap-1">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onViewChange(v.id)}
          title={v.label}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            activeView === v.id
              ? "bg-teal-400 text-white"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={v.path} />
          </svg>
        </button>
      ))}
    </aside>
  );
}
