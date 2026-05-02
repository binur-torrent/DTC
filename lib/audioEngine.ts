/**
 * audioEngine.ts — Web Audio API synthesizer for Wavy
 *
 * Rhythmic/melodic style: arpeggiator + bass + pad, tempo-synced.
 * All transitions are smoothed to avoid clicks.
 */

import type { MusicParams } from "./types";

// ─── Music theory ──────────────────────────────────────────

const NOTE_FREQS: Record<string, number> = {
  C3: 130.81, "C#3": 138.59, D3: 146.83, "D#3": 155.56, E3: 164.81,
  F3: 174.61, "F#3": 185.0, G3: 196.0, "G#3": 207.65, A3: 220.0,
  "A#3": 233.08, B3: 246.94,
  C4: 261.63, "C#4": 277.18, D4: 293.66, "D#4": 311.13, E4: 329.63,
  F4: 349.23, "F#4": 369.99, G4: 392.0, "G#4": 415.3, A4: 440.0,
  "A#4": 466.16, B4: 493.88,
  C5: 523.25, "C#5": 554.37, D5: 587.33, "D#5": 622.25, E5: 659.26,
  F5: 698.46, "F#5": 739.99, G5: 783.99, "G#5": 830.61, A5: 880.0,
  "A#5": 932.33, B5: 987.77,
};

const ALL_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Chord name → array of semitone offsets from root
const CHORD_SHAPES: Record<string, number[]> = {
  "maj":  [0, 4, 7],
  "min":  [0, 3, 7],
  "7":    [0, 4, 7, 10],
  "maj7": [0, 4, 7, 11],
  "min7": [0, 3, 7, 10],
  "dim":  [0, 3, 6],
  "aug":  [0, 4, 8],
  "sus2": [0, 2, 7],
  "sus4": [0, 5, 7],
  "9":    [0, 4, 7, 10, 14],
};

function parseChord(chord: string): { root: string; type: string } {
  // Handle chords like "Cmaj7", "Am7", "F#m", "Bdim", "Gsus4"
  const match = chord.match(/^([A-G]#?)(.*)$/);
  if (!match) return { root: "C", type: "maj" };
  let type = match[2].toLowerCase().replace(/\s/g, "");
  // Normalize common abbreviations
  if (type === "" || type === "major") type = "maj";
  if (type === "m" || type === "minor") type = "min";
  if (type === "m7") type = "min7";
  return { root: match[1], type };
}

function chordToFreqs(chord: string, octave: number): number[] {
  const { root, type } = parseChord(chord);
  const rootIdx = ALL_NOTES.indexOf(root);
  if (rootIdx < 0) return [261.63]; // fallback C4

  const shape = CHORD_SHAPES[type] || CHORD_SHAPES["maj"];
  return shape.map((semitones) => {
    const noteIdx = (rootIdx + semitones) % 12;
    const oct = octave + Math.floor((rootIdx + semitones) / 12);
    const noteName = `${ALL_NOTES[noteIdx]}${oct}`;
    return NOTE_FREQS[noteName] || 261.63;
  });
}

function rootFreq(chord: string, octave: number): number {
  const { root } = parseChord(chord);
  const noteName = `${root}${octave}`;
  return NOTE_FREQS[noteName] || 130.81;
}

// ─── Audio Engine ──────────────────────────────────────────

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Arpeggiator state
  private arpInterval: ReturnType<typeof setInterval> | null = null;
  private arpOsc: OscillatorNode | null = null;
  private arpGain: GainNode | null = null;
  private arpFilter: BiquadFilterNode | null = null;
  private arpNotes: number[] = [];
  private arpIndex = 0;

  // Bass state
  private bassOsc: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;

  // Pad state
  private padOscs: OscillatorNode[] = [];
  private padGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;

  // Current params
  private currentChords: string[] = ["Cmaj7", "Am7", "Fmaj7", "G7"];
  private currentChordIdx = 0;
  private currentTempo = 80;
  private currentIntensity = 0.5;
  private chordChangeInterval: ReturnType<typeof setInterval> | null = null;
  private onChordChange: ((idx: number) => void) | null = null;

  start(onChordChange?: (idx: number) => void) {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.onChordChange = onChordChange || null;

    // Master chain: compressor → gain → destination
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.ratio.value = 4;
    this.compressor.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.compressor);

    this.setupArp();
    this.setupBass();
    this.setupPad();
    this.startSequencer();
  }

  stop() {
    if (this.arpInterval) clearInterval(this.arpInterval);
    if (this.chordChangeInterval) clearInterval(this.chordChangeInterval);
    this.arpOsc?.stop();
    this.bassOsc?.stop();
    this.padOscs.forEach((o) => o.stop());
    this.ctx?.close();
    this.ctx = null;
    this.arpInterval = null;
    this.chordChangeInterval = null;
    this.arpOsc = null;
    this.bassOsc = null;
    this.padOscs = [];
  }

  private setupArp() {
    if (!this.ctx || !this.masterGain) return;
    this.arpFilter = this.ctx.createBiquadFilter();
    this.arpFilter.type = "lowpass";
    this.arpFilter.frequency.value = 2000;
    this.arpFilter.Q.value = 2;

    this.arpGain = this.ctx.createGain();
    this.arpGain.gain.value = 0.18;
    this.arpGain.connect(this.arpFilter);
    this.arpFilter.connect(this.masterGain);

    this.arpOsc = this.ctx.createOscillator();
    this.arpOsc.type = "triangle";
    this.arpOsc.frequency.value = 440;
    this.arpOsc.connect(this.arpGain);
    this.arpOsc.start();
  }

  private setupBass() {
    if (!this.ctx || !this.masterGain) return;
    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.value = 0.15;
    this.bassGain.connect(this.masterGain);

    this.bassOsc = this.ctx.createOscillator();
    this.bassOsc.type = "sine";
    this.bassOsc.frequency.value = 130.81;
    this.bassOsc.connect(this.bassGain);
    this.bassOsc.start();
  }

  private setupPad() {
    if (!this.ctx || !this.masterGain) return;

    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = "lowpass";
    this.padFilter.frequency.value = 800;
    this.padFilter.Q.value = 0.5;

    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0.06;
    this.padGain.connect(this.padFilter);
    this.padFilter.connect(this.masterGain);

    // 3-voice pad
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 261.63 + i * 0.8; // slight detune
      osc.connect(this.padGain);
      osc.start();
      this.padOscs.push(osc);
    }
  }

  private startSequencer() {
    // Arpeggiator: step through notes at tempo-synced rate (16th notes)
    this.scheduleArp();
    // Chord changes: every 4 beats
    this.scheduleChordChange();
  }

  private scheduleArp() {
    if (this.arpInterval) clearInterval(this.arpInterval);
    const sixteenthMs = (60000 / this.currentTempo) / 4;
    this.arpInterval = setInterval(() => this.arpTick(), sixteenthMs);
  }

  private scheduleChordChange() {
    if (this.chordChangeInterval) clearInterval(this.chordChangeInterval);
    const barMs = (60000 / this.currentTempo) * 4; // 4 beats per bar
    this.chordChangeInterval = setInterval(() => {
      this.currentChordIdx = (this.currentChordIdx + 1) % this.currentChords.length;
      this.updateVoicesToCurrentChord();
      this.onChordChange?.(this.currentChordIdx);
    }, barMs);
  }

  private arpTick() {
    if (!this.ctx || !this.arpOsc || !this.arpGain) return;
    const now = this.ctx.currentTime;

    if (this.arpNotes.length === 0) return;

    // Cycle through arp notes up and down
    const totalSteps = this.arpNotes.length * 2 - 2;
    const step = this.arpIndex % (totalSteps || 1);
    const idx = step < this.arpNotes.length ? step : totalSteps - step;
    const freq = this.arpNotes[Math.min(idx, this.arpNotes.length - 1)];

    // Plucky envelope: quick attack, medium decay
    this.arpOsc.frequency.setTargetAtTime(freq, now, 0.005);
    this.arpGain.gain.setValueAtTime(0.2 * this.currentIntensity, now);
    this.arpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    this.arpIndex++;
  }

  private updateVoicesToCurrentChord() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chord = this.currentChords[this.currentChordIdx] || "Cmaj";

    // Arp notes (octave 4 + 5 for range)
    const o4 = chordToFreqs(chord, 4);
    const o5 = chordToFreqs(chord, 5);
    this.arpNotes = [...o4, ...o5.slice(0, 2)];
    this.arpIndex = 0;

    // Bass: root at octave 3
    const bass = rootFreq(chord, 3);
    this.bassOsc?.frequency.setTargetAtTime(bass, now, 0.08);

    // Pad: chord tones at octave 4
    o4.forEach((freq, i) => {
      if (this.padOscs[i]) {
        this.padOscs[i].frequency.setTargetAtTime(freq + (i * 0.7), now, 0.3);
      }
    });
  }

  updateMusic(params: MusicParams) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    this.currentChords = params.chords.slice(0, 4);
    this.currentIntensity = params.intensity;

    // Update tempo if changed significantly
    if (Math.abs(params.tempo - this.currentTempo) > 3) {
      this.currentTempo = params.tempo;
      this.scheduleArp();
      this.scheduleChordChange();
    }

    // Update instrument timbre
    const arpType = this.instrumentToOscType(params.instrument, "arp");
    if (this.arpOsc) this.arpOsc.type = arpType;

    // Update filter based on intensity
    if (this.arpFilter) {
      const cutoff = 600 + params.intensity * 3400;
      this.arpFilter.frequency.setTargetAtTime(cutoff, now, 0.3);
    }

    // Pad volume scales inversely with intensity for balance
    if (this.padGain) {
      this.padGain.gain.setTargetAtTime(0.03 + (1 - params.intensity) * 0.06, now, 0.5);
    }

    // Master volume
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0.2 + params.intensity * 0.25, now, 0.3);
    }

    // Bass volume
    if (this.bassGain) {
      this.bassGain.gain.setTargetAtTime(0.08 + params.intensity * 0.12, now, 0.3);
    }

    // Pad filter
    if (this.padFilter) {
      this.padFilter.frequency.setTargetAtTime(400 + params.intensity * 1200, now, 0.5);
    }

    // Immediately update current chord voices
    this.currentChordIdx = 0;
    this.updateVoicesToCurrentChord();
    this.onChordChange?.(0);
  }

  private instrumentToOscType(instrument: string, voice: "arp" | "pad"): OscillatorType {
    if (voice === "pad") return "sawtooth";
    switch (instrument) {
      case "piano": return "triangle";
      case "synth": return "sawtooth";
      case "bell": return "sine";
      case "strings": return "sawtooth";
      case "pluck": return "triangle";
      default: return "triangle";
    }
  }

  isRunning(): boolean {
    return this.ctx !== null && this.ctx.state === "running";
  }
}

// Singleton
let engine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}
