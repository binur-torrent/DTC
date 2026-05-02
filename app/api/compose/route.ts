import { NextResponse } from "next/server";
import type { CognitiveFrame, MusicParams, Mood } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a real-time music composer AI for a brain-computer interface called Wavy.

You receive brainwave-derived cognitive metrics (focus, stress, calmness, cognitive load, mood, emotion label) and must select musical parameters that reflect and respond to the user's mental state.

Rules:
- Return ONLY valid JSON, no markdown, no explanation.
- The JSON must have these exact keys: key, scale, chords, tempo, instrument, intensity, description.
- "key": a musical key like "C", "D", "Am", "F#m"
- "scale": one of "major", "minor", "dorian", "mixolydian", "pentatonic"
- "chords": an array of exactly 4 chord names (e.g. ["Cmaj7", "Am7", "Fmaj7", "G7"])
- "tempo": integer BPM between 50 and 150
- "instrument": one of "piano", "synth", "bell", "strings", "pluck"
- "intensity": float 0.0 to 1.0
- "description": one short sentence about the musical mood (max 12 words)

Musical mapping guidelines:
- High calmness + low stress → slow tempo, major/dorian scale, warm tones, low intensity
- High focus → moderate tempo, clean tones, steady rhythm, medium intensity
- High stress / overloaded → faster tempo, minor scale, higher intensity, tense chords (diminished, minor7)
- Drifting → slow, pentatonic, gentle arpeggios, very low intensity
- POSITIVE emotion label → brighter keys (C, G, D major), uplifting progressions
- NEGATIVE emotion label → darker keys (Am, Em, Dm), minor progressions
- NEUTRAL → balanced, dorian or mixolydian modes

Always vary your chord progressions. Never repeat the same 4 chords twice in a row.`;

// Fallback presets keyed by mood — used when API key is missing or call fails
const FALLBACK: Record<Mood, MusicParams> = {
  calm: {
    key: "C", scale: "major", chords: ["Cmaj7", "Am7", "Fmaj7", "G7"],
    tempo: 72, instrument: "piano", intensity: 0.3,
    description: "Gentle major progressions, breath-like pacing",
  },
  focused: {
    key: "D", scale: "dorian", chords: ["Dm7", "G7", "Cmaj7", "Am7"],
    tempo: 95, instrument: "pluck", intensity: 0.5,
    description: "Steady dorian drive, focused and clear",
  },
  engaged: {
    key: "G", scale: "mixolydian", chords: ["Gmaj", "F", "Am", "C"],
    tempo: 105, instrument: "synth", intensity: 0.55,
    description: "Active mixolydian groove, alert and balanced",
  },
  overloaded: {
    key: "Am", scale: "minor", chords: ["Am7", "Dm7", "E7", "Bdim"],
    tempo: 130, instrument: "strings", intensity: 0.85,
    description: "Tense minor build, pressure rising fast",
  },
  drifting: {
    key: "Em", scale: "pentatonic", chords: ["Em7", "Am7", "Cmaj7", "Bm7"],
    tempo: 60, instrument: "bell", intensity: 0.2,
    description: "Floating pentatonic drift, soft and open",
  },
};

// Keep track of last response to avoid repetition
let lastChords: string[] = [];

interface Body {
  window?: CognitiveFrame[];
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const win = Array.isArray(body.window) ? body.window : [];
  const last = win[win.length - 1];

  const apiKey = process.env.FEATHERLESS_API_KEY;
  const model = process.env.FEATHERLESS_MODEL || "Qwen/Qwen2.5-72B-Instruct";

  if (!apiKey || !last) {
    const mood: Mood = last?.mood ?? "calm";
    return NextResponse.json({ music: FALLBACK[mood], source: "fallback" });
  }

  try {
    const summary = summarize(win);

    const resp = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: summary },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[compose] Featherless API error ${resp.status}:`, errText);
      throw new Error(`API returned ${resp.status}`);
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonStr = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const music = JSON.parse(jsonStr) as MusicParams;

    // Validate the shape
    if (!music.key || !music.chords || !Array.isArray(music.chords) || music.chords.length < 4) {
      throw new Error("Invalid music params shape");
    }

    // Ensure tempo is reasonable
    music.tempo = Math.max(50, Math.min(150, music.tempo || 80));
    music.intensity = Math.max(0, Math.min(1, music.intensity || 0.5));

    lastChords = music.chords;
    return NextResponse.json({ music, source: "ai" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[compose] Error:", msg);
    const mood: Mood = last?.mood ?? "calm";
    return NextResponse.json({ music: FALLBACK[mood], source: "fallback", error: msg });
  }
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function summarize(win: CognitiveFrame[]): string {
  const last = win[win.length - 1];
  const half = Math.max(1, Math.floor(win.length / 2));
  const earlier = win.slice(0, half);
  const recent = win.slice(half);

  const trend = (k: keyof CognitiveFrame) => {
    const e = avg(earlier.map((f) => Number(f[k])));
    const r = avg(recent.map((f) => Number(f[k])));
    const d = r - e;
    if (Math.abs(d) < 0.04) return "steady";
    return d > 0 ? "rising" : "falling";
  };

  const lines = [
    `Current mood: ${last.mood}`,
    `Emotion label from EEG dataset: ${last.datasetLabel || "unknown"}`,
    `Focus: ${last.focus.toFixed(2)} (${trend("focus")})`,
    `Stress: ${last.stress.toFixed(2)} (${trend("stress")})`,
    `Calmness: ${last.calmness.toFixed(2)} (${trend("calmness")})`,
    `Cognitive load: ${last.cognitiveLoad.toFixed(2)} (${trend("cognitiveLoad")})`,
    `Emotional intensity: ${last.emotionalIntensity.toFixed(2)}`,
    `BPM estimate: ${Math.round(last.bpm)}`,
  ];

  if (lastChords.length > 0) {
    lines.push(`Previous chords were: ${lastChords.join(", ")} — please vary from these.`);
  }

  return lines.join("\n");
}
