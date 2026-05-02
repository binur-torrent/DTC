import { NextResponse } from "next/server";
import type { CognitiveFrame, MusicParams, Mood } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a real-time ambient music composer AI for a brain-computer interface called Wavy.

You receive brainwave-derived cognitive metrics and must select musical parameters that reflect the user's mental state through textured, soulful, and sentimental soundscapes.

Rules:
- Return ONLY valid JSON, no markdown, no explanation.
- The JSON must have these exact keys: key, scale, chords, tempo, instrument, intensity, description.
- "key": a musical key like "C", "D", "Am", "F#m"
- "scale": one of "major", "minor", "dorian", "mixolydian", "pentatonic"
- "chords": an array of exactly 4 chord names (e.g. ["Cmaj7", "Am7", "Fmaj7", "G7"])
- "tempo": integer BPM between 40 and 90 (Keep it slow and ambient)
- "instrument": one of "piano", "synth", "bell", "strings"
- "intensity": float 0.0 to 1.0
- "description": one short sentence about the musical mood (max 12 words)

Musical mapping guidelines:
- High calmness + low stress → slow tempo (40-60 BPM), major/dorian, warm textures, low intensity
- High focus → moderate tempo (70-80 BPM), clean piano/bell, steady but soft, medium intensity
- High stress / overloaded → slow tempo, minor scale, slightly thicker synth textures, tense but soulful chords
- Drifting → very slow, pentatonic, floating bells, very low intensity
- POSITIVE emotion label → brighter keys (C, G, D major), uplifting soulful progressions
- NEGATIVE emotion label → darker keys (Am, Em, Dm), sentimental minor progressions
- NEUTRAL → balanced, dreamy dorian or mixolydian modes

Always favor lush, evolving chords (maj7, min7, 9ths). Avoid anything rhythmic, fast, or "crazy".`;

// Fallback presets keyed by mood — used when API key is missing or call fails
const FALLBACK: Record<Mood, MusicParams> = {
  calm: {
    key: "C", scale: "major", chords: ["Cmaj7", "Am7", "Fmaj7", "G7"],
    tempo: 55, instrument: "piano", intensity: 0.25,
    description: "Deeply calm major textures, breathing and slow",
  },
  focused: {
    key: "D", scale: "dorian", chords: ["Dm9", "G13", "Cmaj7", "Am7"],
    tempo: 75, instrument: "piano", intensity: 0.45,
    description: "Clean, steady focus with soulful dorian textures",
  },
  engaged: {
    key: "G", scale: "mixolydian", chords: ["Gmaj9", "Fmaj7", "Am7", "Cmaj7"],
    tempo: 82, instrument: "synth", intensity: 0.5,
    description: "Warm mixolydian clouds, active but grounded",
  },
  overloaded: {
    key: "Am", scale: "minor", chords: ["Am9", "Dm7", "E7alt", "Fmaj7"],
    tempo: 65, instrument: "strings", intensity: 0.7,
    description: "Heavy minor clouds, slow and sentimental",
  },
  drifting: {
    key: "Em", scale: "pentatonic", chords: ["Em9", "Am7", "Cmaj7", "Bm7"],
    tempo: 45, instrument: "bell", intensity: 0.15,
    description: "Floating in air, ethereal pentatonic drift",
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

    // Ensure tempo is reasonable for ambient music
    music.tempo = Math.max(40, Math.min(95, music.tempo || 70));
    music.intensity = Math.max(0, Math.min(1, music.intensity || 0.4));

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
  if (!last) return "User state is initializing.";

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
