# Wavy — Implementation Handoff Doc

A single-source brain dump so any future session (or a fresh Claude) can pick up exactly where we are.

---

## 1. What Wavy is

**Wavy is a neuroadaptive human-computer interface platform.** It sits at the intersection of neurotech, healthtech, biotech, AI, and adaptive interfaces. It is **NOT** a music app, a visualizer, or a meditation tool. Music and visuals are *demonstration layers only* — the product is cognitive-state-aware computing.

Pipeline:

1. Receive EEG-derived brainwave data (simulated — no hardware).
2. Interpret cognitive state via lightweight ML / rule-based logic.
3. Convert state into adaptive AI outputs (visuals + audio + narration).
4. Close the loop in realtime — neurofeedback.

Healthcare framings to keep in copy/UI: mental-health monitoring, cognitive performance, accessibility, adaptive patient environments.

## 2. Hackathon constraints (locked decisions)

- **Time budget: 5 hours total.**
- **Backend: Next.js monolith + standalone WS server** (one `npm run dev` runs both).
- **AI role: Rule-based adaptation + Claude as narrator only.** LLM never drives parameters; rules do. Keeps the demo deterministic.
- **Hardware: Simulation only.** No Muse / OpenBCI adapters ship.
- **Single page** dashboard. No Landing route, no Session Summary route. Brief intro overlay handles the "init session" moment.

## 3. Tech stack (pinned)

- Next.js 15 App Router + TypeScript + React 18.3.1
- Tailwind CSS v3 (NOT v4 — chosen for stability in a sprint)
- @react-three/fiber 8 + @react-three/drei 9 + @react-three/postprocessing 2 + three 0.169 (NOT R3F 9 / React 19)
- framer-motion 11
- zustand 5
- ws 8 (Node WebSocket lib)
- @anthropic-ai/sdk — model `claude-haiku-4-5-20251001` with prompt caching (NOT yet installed; deferred to Phase 4)
- concurrently + tsx for `npm run dev`
- (Stretch) tone for procedural audio

## 4. Ports — IMPORTANT

User has other dev work holding 3000/3001. Do NOT kill those processes. Wavy uses:

- **Web: 3939** (`next dev -p 3939`)
- **WS: 3940** (`WS_PORT=3940 tsx watch server/ws.ts`)

Client default WS URL = `ws://localhost:3940` (overridable via `NEXT_PUBLIC_WS_URL`).

## 5. Architecture diagram

```
┌──────────────────────────────────────────────────────────────┐
│ Next.js (port 3939)                                          │
│   app/page.tsx  →  Live Neural Dashboard                     │
│     ├─ NeuralField (R3F)                                     │
│     ├─ MetricPanels (focus / stress / calm / load / intensity│
│     ├─ BrainwaveGraph (α/β/θ sliding 6s window)              │
│     ├─ NarratorOverlay (Claude readouts)                     │
│     ├─ IntroOverlay ("Initialize session")                   │
│     └─ useCognitiveStream() → ws://localhost:3940            │
│                                                               │
│   app/api/narrate/route.ts                                   │
│     POST { window: CognitiveFrame[] } → Claude Haiku → text  │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │  WS frames @ 30 Hz
                              │
┌──────────────────────────────────────────────────────────────┐
│ Node WS server (server/ws.ts, port 3940)                     │
│   ├─ EEGSimulator        scripted scene + organic drift      │
│   ├─ StateInterpreter    rule-based → CognitiveFrame         │
│   └─ broadcasts CognitiveFrame at 30 Hz to all clients       │
└──────────────────────────────────────────────────────────────┘
```

The WS server owns the simulation clock — single global simulator shared across all clients. The browser is a pure consumer. Narrator runs on demand (~every 10s) via the Next.js API route; the LLM never blocks the realtime loop.

## 6. File layout

```
DTC/
├── app/
│   ├── layout.tsx                  # metadata: "Wavy — Neuroadaptive Interface"
│   ├── page.tsx                    # dashboard composition + intro overlay
│   ├── globals.css                 # tailwind directives + custom utilities
│   └── api/
│       └── narrate/route.ts        # Claude narrator endpoint  [TODO Phase 4]
├── components/                     # [TODO Phase 2/3]
│   ├── NeuralField.tsx             # R3F hero scene
│   ├── MetricPanel.tsx             # animated metric bar/orb
│   ├── BrainwaveGraph.tsx          # canvas sliding waveform
│   ├── NarratorOverlay.tsx         # animated text readout
│   └── IntroOverlay.tsx            # "Initialize Session" moment
├── lib/
│   ├── cognitiveStore.ts           # zustand store, ring buffer, status
│   ├── useCognitiveStream.ts       # WS hook, auto-reconnect
│   ├── types.ts                    # CognitiveFrame, Mood, ScenePhase, WSMessage
│   └── narratorClient.ts           # fetch /api/narrate, debounced  [TODO Phase 4]
├── server/
│   ├── ws.ts                       # WS server entry @ 30 Hz
│   ├── eegSimulator.ts             # scripted scene + organic drift
│   └── stateInterpreter.ts         # rule-based mapping → CognitiveFrame
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs                 # outputFileTracingRoot fix
├── .env.local                      # ANTHROPIC_API_KEY (gitignored)
└── DOCS.md                         # this file
```

## 7. Cognitive data model

`lib/types.ts` — DO NOT change shapes; everything keys off these.

```ts
export type Mood = "calm" | "focused" | "engaged" | "overloaded" | "drifting";
export type ScenePhase = "calm" | "focus_rise" | "deep_focus" | "overload" | "recovery";

export interface CognitiveFrame {
  t: number;                    // ms epoch
  alpha: number;                // 0..1
  beta:  number;                // 0..1
  theta: number;                // 0..1
  focus: number;                // 0..1
  stress: number;               // 0..1
  calmness: number;             // 0..1
  cognitiveLoad: number;        // 0..1
  emotionalIntensity: number;   // 0..1
  mood: Mood;
  bpm: number;                  // 55..110
  phase: ScenePhase;
}

export type WSMessage =
  | { type: "heartbeat"; t: number }
  | { type: "frame"; frame: CognitiveFrame };
```

## 8. EEG simulator (`server/eegSimulator.ts`)

Scripted scene loop, ~77s total:

| Phase        | α    | β    | θ    | Duration |
|--------------|------|------|------|----------|
| calm         | 0.74 | 0.24 | 0.36 | 22 s     |
| focus_rise   | 0.50 | 0.52 | 0.30 | 10 s     |
| deep_focus   | 0.40 | 0.74 | 0.22 | 15 s     |
| overload     | 0.28 | 0.92 | 0.44 | 12 s     |
| recovery     | 0.64 | 0.40 | 0.34 | 18 s     |

Layered on baselines:
- Slow breathing sine (~35 s period, amp 0.04)
- Faster ripple sine (~12 s period, amp 0.03)
- Low-pass filtered white noise per band (smoothing α=0.985, β=0.965, θ=0.99)
- Beta > 0.6 suppresses alpha (gain 0.18)
- Theta rises when alpha < 0.4 (gain 0.08)
- Overload phase: 5% chance / tick of beta+0.07, theta+0.05 spike
- Smoothstep crossfade: dwell on current phase for first 70 %, blend into next over final 30 %

Already verified: 30 Hz frames look right. At t≈0–3 s sample showed phase=deep_focus → mood transitioning focused → overloaded as scripted scene rolls.

## 9. State interpreter (`server/stateInterpreter.ts`)

All weights are tunable constants at the top of the file:

```
FOCUS:  beta*1.0  + theta*-0.5 + 0.20
CALM:   alpha*1.0 + beta*-0.5  + 0.30
STRESS: beta*1.0  + intensity*0.30 + alpha*-0.50
LOAD:   EMA(beta + 0.6*theta), α=0.04
INTENSITY: EMA(|Δα|+|Δβ|+|Δθ| * 8), α=0.05
BPM:    70 + stress*30 - calm*15, EMA α=0.03
```

Mood thresholds (in order):
1. `phase==="overload"` OR (stress>0.65 AND load>0.6) → **overloaded**
2. focus > 0.68 → **focused**
3. calm > 0.65 AND focus < 0.5 → **calm**
4. calm < 0.35 AND focus < 0.45 → **drifting**
5. else → **engaged**

## 10. WS server (`server/ws.ts`)

- Global singleton simulator + interpreter
- Broadcasts `{ type: "frame", frame }` at 30 Hz
- On new connection, immediately sends `lastFrame` so client never sees a blank period
- Logs connect/disconnect

## 11. Client store (`lib/cognitiveStore.ts`)

Zustand. State:
- `status: "connecting" | "connected" | "disconnected"`
- `frame: CognitiveFrame | null`
- `history: CognitiveFrame[]` — ring buffer, **HISTORY_SIZE = 180** (6 s @ 30 Hz)

Actions: `setStatus`, `pushFrame` (slice(1) when at capacity).

## 12. WS hook (`lib/useCognitiveStream.ts`)

Auto-reconnect on close (800 ms retry). Defaults to `ws://localhost:3940`. Override via `NEXT_PUBLIC_WS_URL`. Already wired in Phase 0 stub.

## 13. Visual direction (the make-or-break piece)

One R3F scene: **a flowing neural particle field** in 3D.

- 5–10 k particles on a slowly rotating implicit surface, displaced by a custom GLSL shader.
- Shader uniforms bound to cognitive state:
  - `focus` → coherence / particle alignment
  - `stress` → turbulence amplitude + warmer hue
  - `calmness` → smoothness + cooler hue, slower flow
  - `cognitiveLoad` → density / glow
- Bloom postprocessing for cinematic depth.
- Palette: deep indigo / cyan / magenta accents on true black. No chrome, no gradients-from-Figma.
- Around the field: thin holographic UI chrome — corner brackets, faint scanlines, single readout ribbon. Frosted glass for metric panels; nothing rectangular-corporate.

## 14. Narrator

`POST /api/narrate` body: `{ window: CognitiveFrame[] /* last ~30 s, downsampled to ~30 frames */ }`
Response: `{ text: string }` (one short sentence, ≤14 words, present tense, clinical-but-warm).

System prompt (cached):
> You are the cognitive-state narrator for Wavy, a neuroadaptive interface. Given the last 30 seconds of cognitive metrics, produce one short sentence (≤14 words) describing the user's current mental state and its trajectory. Use plain language a clinician or a calm friend would use. Avoid jargon, avoid numbers, avoid emojis.

Model: `claude-haiku-4-5-20251001`, `max_tokens: 60`, prompt caching on the system block. Client polls every 10 s while session is active; on-screen text crossfades in via Framer Motion.

**Fallback**: if `ANTHROPIC_API_KEY` is missing, narrator returns deterministic phrase keyed on `mood` so the demo never breaks. Suggested table:
- calm → "Baseline alpha dominant — relaxed and receptive."
- focused → "Focus consolidating, attention narrowing."
- engaged → "Engagement steady, balanced cognitive tone."
- overloaded → "Cognitive load spiking — system flagging overstimulation."
- drifting → "Attention loosening, mind wandering toward rest."

## 15. Aesthetic system

`tailwind.config.ts` palette:
- `ink` #05060a (true black background)
- `graphite` #0c0e14
- `bone` #e6e8ee (text)
- `neural.cyan / .indigo / .magenta / .amber / .rose` (accents)
- `scan` keyframe for scanlines

`app/globals.css` utilities:
- `.corner-bracket` (with `.tl / .tr / .bl / .br` variants)
- `.panel` — frosted glass, indigo border, bloom shadow
- `.label-mono` — monospaced uppercase tracking-wide
- `.glow-text`
- `body { overflow: hidden }`

## 16. Build phases (5-hour budget)

| Phase | Time        | Status        | Deliverable                                                                  |
|-------|-------------|---------------|------------------------------------------------------------------------------|
| 0     | 0:00 – 0:30 | ✅ DONE       | Scaffold, Tailwind, deps, dark theme, WS heartbeat, `connecting → connected`. |
| 1     | 0:30 – 1:30 | ✅ DONE       | Simulator + interpreter + 30 Hz broadcast + zustand store + WS hook + raw readouts. |
| 2     | 1:30 – 2:30 | ✅ DONE       | `MetricPanel` (5 panels), `BrainwaveGraph` (canvas rAF), `MoodReadout`, `HudHeader`, dashboard layout w/ scanlines + corner brackets. |
| 3     | 2:30 – 4:00 | ✅ DONE       | `NeuralField` R3F scene — 8000 particles on Fibonacci sphere, custom GLSL shader (state-bound uniforms uFocus/uStress/uCalm/uLoad), bloom postprocessing, additive blending. |
| 4     | 4:00 – 4:30 | ✅ DONE       | `/api/narrate` (Claude Haiku 4.5, prompt-cached system block, deterministic fallback table), `useNarrator` hook (10s poll), `NarratorOverlay` (framer-motion crossfade). |
| 5     | 4:30 – 5:00 | ✅ DONE       | `IntroOverlay` (animated rings, "Initialize Neuroadaptive Session" CTA, Enter/Space/click to dismiss), full layout polish.|

**Hard rule:** at 4:00, freeze new features. Anything not working is cut.

## 17. What's actually been done (verified)

1. ✅ Repo scaffolded; `package.json` scripts pin custom ports (3939 / 3940), uses `concurrently` + `tsx`.
2. ✅ `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs` (with `outputFileTracingRoot` to silence multi-lockfile warning), `app/globals.css`, `app/layout.tsx`.
3. ✅ `app/page.tsx` Phase-0 stub: shows status + raw frame readout.
4. ✅ `lib/types.ts`, `lib/cognitiveStore.ts`, `lib/useCognitiveStream.ts`.
5. ✅ `server/eegSimulator.ts` — scripted scene + organic layers.
6. ✅ `server/stateInterpreter.ts` — rule-based metrics + mood inference + BPM.
7. ✅ `server/ws.ts` — broadcasts at 30 Hz; sends last frame on connect.
8. ✅ End-to-end **probe verified**: opened raw `ws://localhost:3940`, received frames, values cycle through scripted scenes correctly. Sample at t≈0/1/3 s of probe:
   - frame 1: phase=deep_focus, mood=focused, α=0.42 β=0.73 θ=0.24, foc=0.81 str=0.53 calm=0.35, bpm=81
   - frame 30: phase=deep_focus, mood=focused, similar
   - frame 90: phase=deep_focus, mood=overloaded (stress crossed threshold), bpm=83
9. ✅ Memory written: `~/.claude/projects/-Users-binurbalmukhamed-Desktop-Projects-DTC/memory/project_wavy.md`.
10. ✅ Plan saved: `~/.claude/plans/nested-petting-cloud.md`.

## 18. Errors hit and fixes (so they don't repeat)

- **EADDRINUSE 3001**: user had unrelated dev processes (PIDs 92546, 93601). **Fix:** moved Wavy to 3939/3940. Did NOT kill user's other processes.
- **Multi-lockfile warning**: Next.js found `~/package-lock.json`. **Fix:** `outputFileTracingRoot: __dirname` in `next.config.mjs`.
- **Failed bg task bth1ffn3e**: died from EADDRINUSE; cleaned via `pkill -f "tsx watch server/ws.ts"` and `pkill -f "next dev"`.

## 19. Demo script (~60 s, must rehearse twice)

1. Open dashboard. Intro overlay: "Initialize Neuroadaptive Session." Click. Field ignites.
2. Field calm, cool blues. Narrator: *"Baseline alpha dominant — relaxed and receptive."*
3. ~20 s in (focus_rise → deep_focus). Particles align, hue → cyan, β climbs on graph. Narrator: *"Focus consolidating, attention narrowing."*
4. ~45 s (overload). Field turbulent, hue warm, stress orb fills, BPM jumps. Narrator: *"Cognitive load spiking — system flagging overstimulation."*
5. Decay → calm (recovery). Narrator: *"Recovery underway, parasympathetic tone returning."*

## 20. Verification checklist (ship gate)

1. `npm run dev` starts both processes cleanly.
2. Open `http://localhost:3939`. Within 1 s: panels move, graph scrolls.
3. Watch one full ~77 s loop: visible shifts at focus_rise (~22 s) and overload (~47 s).
4. Narrator overlay fades in within 10 s of session start, changes across the scene.
5. Without `ANTHROPIC_API_KEY`: fallback fires, no UI error.
6. No console errors over a full loop (R3F shader compile errors will spam — watch for these).
7. Two back-to-back demo runs without reload.

**Ship criteria:** visual reacts to state continuously, narrator fires, no reload during demo. Everything else is bonus.

## 21. Final state

All six phases shipped. The complete file inventory:

- `app/page.tsx` — composition: IntroOverlay → HudHeader → 3-col grid (5 MetricPanels | NeuralField+NarratorOverlay | MoodReadout+RawBands) → BrainwaveGraph strip.
- `app/api/narrate/route.ts` — Claude Haiku 4.5 narrator with prompt caching + deterministic fallback table.
- `components/HudHeader.tsx` — top ribbon (link status + 30Hz + WAVY title + session timer).
- `components/MetricPanel.tsx` — five animated metric bars (focus/stress/calm/load/intensity), each with accent + glow.
- `components/BrainwaveGraph.tsx` — canvas sliding 6s waveform, rAF loop reading store via `getState()` (no React rerenders).
- `components/MoodReadout.tsx` — animated mood ring + BPM readout, color shifts with mood.
- `components/NeuralField.tsx` — R3F particle field, 8000 particles, custom GLSL shader, state-bound uniforms, additive blending, bloom.
- `components/NarratorOverlay.tsx` — framer-motion crossfade for narrator text, source label.
- `components/IntroOverlay.tsx` — fullscreen "Initialize Neuroadaptive Session" with animated rings and CTA.
- `lib/useNarrator.ts` — 10s polling hook, downsamples history to ~30 frames, posts to `/api/narrate`.
- `lib/cognitiveStore.ts`, `lib/useCognitiveStream.ts`, `lib/types.ts` — unchanged from Phase 0/1.
- `server/ws.ts`, `server/eegSimulator.ts`, `server/stateInterpreter.ts` — unchanged from Phase 1.

To run a fresh demo:
1. `npm run dev` (or, if a session is already running on 3939/3940, just refresh the browser).
2. Visit `http://localhost:3939`.
3. Click "Initialize Neuroadaptive Session" (or press Enter / Space).
4. Watch the ~77s scripted scene cycle: calm → focus_rise → deep_focus → overload → recovery.
5. (Optional) Set `ANTHROPIC_API_KEY` in `.env.local` to swap fallback narration for Claude Haiku.

## 22. Memory & plan locations

- Project memory: `/Users/binurbalmukhamed/.claude/projects/-Users-binurbalmukhamed-Desktop-Projects-DTC/memory/project_wavy.md`
- Plan: `/Users/binurbalmukhamed/.claude/plans/nested-petting-cloud.md`
- Full prior transcript: `/Users/binurbalmukhamed/.claude/projects/-Users-binurbalmukhamed-Desktop-Projects-DTC/ec8698e9-6c08-4818-9da0-0d3135b7344d.jsonl`

## 23. Anti-goals (do not drift here)

- No "music app" / "visualizer" / "meditation app" framing in copy or commits. It's a **neuroadaptive HCI**.
- No LLM in the realtime control loop. Rules drive adaptation; LLM only narrates.
- No real-hardware adapter stub files. The simulator's interface is pluggable but no Muse/OpenBCI code ships.
- No backwards-compat shims, no abstraction-before-need, no comments explaining the obvious.
- No new routes beyond `/` and `/api/narrate`.
- No Tailwind v4, no React 19, no R3F 9. Stay on the pinned versions.
