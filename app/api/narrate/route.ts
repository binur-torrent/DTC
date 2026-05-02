import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { CognitiveFrame, Mood } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are the cognitive-state narrator for Wavy, a neuroadaptive interface that reads simulated EEG and infers mental state in realtime.

Given a short window of recent cognitive metrics, write ONE short sentence (max 14 words) describing the user's current mental state and its trajectory.

Rules:
- Plain language a clinician or a calm friend would use.
- No jargon, no numbers, no emojis, no quotation marks.
- Present tense, observational.
- Vary phrasing across calls — never repeat the same wording back-to-back.
- Reflect direction (rising / settling / spiking / receding) when the trajectory is clear.

Return only the sentence, nothing else.`;

const FALLBACK: Record<Mood, string[]> = {
  calm:       ["Baseline alpha dominant, body relaxed and receptive.", "Resting state holding, breath and rhythm aligned."],
  focused:    ["Focus consolidating, attention narrowing onto a single thread.", "Concentration deepening, executive control engaged."],
  engaged:    ["Engagement steady, cognitive tone balanced and alert.", "Thinking is active but not strained."],
  overloaded: ["Cognitive load spiking — system flagging overstimulation.", "Strain rising, working memory under pressure."],
  drifting:   ["Attention loosening, mind wandering toward rest.", "Awareness softening, drifting between thoughts."],
};

let lastFallbackIdx = 0;

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

  if (!process.env.ANTHROPIC_API_KEY || !last) {
    const mood: Mood = last?.mood ?? "calm";
    const opts = FALLBACK[mood];
    const text = opts[lastFallbackIdx++ % opts.length];
    return NextResponse.json({ text, source: "fallback" });
  }

  try {
    const summary = summarize(win);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: summary }],
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim()
      .replace(/^["']|["']$/g, "");

    return NextResponse.json({ text: text || FALLBACK[last.mood][0], source: "claude" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const opts = FALLBACK[last.mood];
    const text = opts[lastFallbackIdx++ % opts.length];
    return NextResponse.json({ text, source: "error", error: msg });
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

  return [
    `mood: ${last.mood}`,
    `phase: ${last.phase}`,
    `focus: ${last.focus.toFixed(2)} (${trend("focus")})`,
    `stress: ${last.stress.toFixed(2)} (${trend("stress")})`,
    `calmness: ${last.calmness.toFixed(2)} (${trend("calmness")})`,
    `cognitive_load: ${last.cognitiveLoad.toFixed(2)} (${trend("cognitiveLoad")})`,
    `emotional_intensity: ${last.emotionalIntensity.toFixed(2)}`,
    `bpm: ${Math.round(last.bpm)}`,
    `window_seconds: ${(win.length / 30).toFixed(0)}`,
  ].join("\n");
}
