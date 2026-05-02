/**
 * audioEngine.ts — Web Audio API synthesizer for Wavy
 *
 * Ambient/Soulful style: slow drifting melody + deep sine pads, tempo-synced.
 * Focused on emotional depth and smooth transitions.
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
  private analyser: AnalyserNode | null = null;

  // Melody state (replacing Arpeggiator with slow drifting melody)
  private melodyInterval: ReturnType<typeof setInterval> | null = null;
  private melodyOsc: OscillatorNode | null = null;
  private melodyGain: GainNode | null = null;
  private melodyFilter: BiquadFilterNode | null = null;
  private melodyNotes: number[] = [];
  private melodyIndex = 0;

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

    // Master chain: compressor → gain → analyser → destination
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.ratio.value = 4;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.compressor);

    this.setupMelody();
    this.setupBass();
    this.setupPad();
    this.startSequencer();
  }

  stop() {
    if (this.melodyInterval) clearInterval(this.melodyInterval);
    if (this.chordChangeInterval) clearInterval(this.chordChangeInterval);
    this.melodyOsc?.stop();
    this.bassOsc?.stop();
    this.padOscs.forEach((o) => o.stop());
    this.ctx?.close();
    this.ctx = null;
    this.melodyInterval = null;
    this.chordChangeInterval = null;
    this.melodyOsc = null;
    this.bassOsc = null;
    this.padOscs = [];
  }

  private setupMelody() {
    if (!this.ctx || !this.masterGain) return;
    this.melodyFilter = this.ctx.createBiquadFilter();
    this.melodyFilter.type = "lowpass";
    this.melodyFilter.frequency.value = 1200;
    this.melodyFilter.Q.value = 1.5;

    this.melodyGain = this.ctx.createGain();
    this.melodyGain.gain.value = 0.12;
    this.melodyGain.connect(this.melodyFilter);
    this.melodyFilter.connect(this.masterGain);

    this.melodyOsc = this.ctx.createOscillator();
    this.melodyOsc.type = "triangle";
    this.melodyOsc.frequency.value = 440;
    this.melodyOsc.connect(this.melodyGain);
    this.melodyOsc.start();
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

    // 3-voice pad (using sine waves for ambient texture)
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 261.63 + i * 1.2; // slight detune
      osc.connect(this.padGain);
      osc.start();
      this.padOscs.push(osc);
    }
  }

  private startSequencer() {
    // Drifting melody: quarter notes for a slower feel
    this.scheduleMelody();
    // Chord changes: every 8 bars for a more sentimental, slow evolution
    this.scheduleChordChange();
  }

  private scheduleMelody() {
    if (this.melodyInterval) clearInterval(this.melodyInterval);
    const quarterNoteMs = (60000 / this.currentTempo);
    this.melodyInterval = setInterval(() => this.melodyTick(), quarterNoteMs);
  }

  private scheduleChordChange() {
    if (this.chordChangeInterval) clearInterval(this.chordChangeInterval);
    const barMs = (60000 / this.currentTempo) * 8; // Longer transitions
    this.chordChangeInterval = setInterval(() => {
      this.currentChordIdx = (this.currentChordIdx + 1) % this.currentChords.length;
      this.updateVoicesToCurrentChord();
      this.onChordChange?.(this.currentChordIdx);
    }, barMs);
  }

  private melodyTick() {
    if (!this.ctx || !this.melodyOsc || !this.melodyGain) return;
    const now = this.ctx.currentTime;

    if (this.melodyNotes.length === 0) return;

    // Drifting selection: slight randomness for soulful feel
    const idx = Math.floor(Math.random() * this.melodyNotes.length);
    const freq = this.melodyNotes[idx];

    // Soft envelope: slow attack, long release
    this.melodyOsc.frequency.setTargetAtTime(freq, now, 0.18);
    this.melodyGain.gain.setTargetAtTime(0.15 * this.currentIntensity, now, 0.2);
    this.melodyGain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);

    this.melodyIndex++;
  }

  private updateVoicesToCurrentChord() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chord = this.currentChords[this.currentChordIdx] || "Cmaj";

    // Melody notes (octave 4 + 5 for range)
    const o4 = chordToFreqs(chord, 4);
    const o5 = chordToFreqs(chord, 5);
    this.melodyNotes = [...o4, ...o5.slice(0, 2)];
    this.melodyIndex = 0;

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
    if (Math.abs(params.tempo - this.currentTempo) > 5) {
      this.currentTempo = params.tempo;
      this.scheduleMelody();
      this.scheduleChordChange();
    }

    // Update instrument timbre
    if (this.melodyOsc) this.melodyOsc.type = "triangle";

    // Update filter based on intensity
    if (this.melodyFilter) {
      const cutoff = 400 + params.intensity * 2000;
      this.melodyFilter.frequency.setTargetAtTime(cutoff, now, 1.2);
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

    // Immediately update current chord voices and force sequencer reset
    this.currentChordIdx = 0;
    this.updateVoicesToCurrentChord();
    this.scheduleChordChange(); // Reset the 8-bar timer
    this.onChordChange?.(0);
  }

  private instrumentToOscType(instrument: string, voice: "melody" | "pad"): OscillatorType {
    if (voice === "pad") return "sine";
    switch (instrument) {
      case "piano": return "triangle";
      case "synth": return "sine";
      case "bell": return "sine";
      case "strings": return "triangle";
      default: return "sine";
    }
  }

  isRunning(): boolean {
    return this.ctx !== null && this.ctx.state === "running";
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }
}

// Singleton
let engine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}
