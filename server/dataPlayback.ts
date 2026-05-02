import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import type { ScenePhase } from "../lib/types";

export interface PlaybackFrame {
  alpha: number;
  beta: number;
  theta: number;
  gamma: number;
  delta: number;
  fft: number[];
  label: string;
}

export class DatasetPlayback {
  private data: PlaybackFrame[] = [];
  private cursor = 0;
  private currentLabel: string | null = null;
  private filteredData: PlaybackFrame[] = [];
  private isLoaded = false;
  
  // Smoothing states
  private currentFrame: PlaybackFrame | null = null;
  private nextFrame: PlaybackFrame | null = null;
  private blend = 0;
  private readonly BLEND_SPEED = 0.08; // Control how fast we transition between rows

  constructor() {
    this.load();
  }

  private async load() {
    const csvPath = path.join(process.cwd(), "data", "emotions.csv");
    if (!fs.existsSync(csvPath)) {
      console.warn(`[dataset] CSV not found at ${csvPath}`);
      return;
    }

    const parser = fs.createReadStream(csvPath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
      })
    );

    const rawRows: any[] = [];
    let minA = Infinity, maxA = -Infinity;
    let minB = Infinity, maxB = -Infinity;
    let minT = Infinity, maxT = -Infinity;
    let minG = Infinity, maxG = -Infinity;
    let minD = Infinity, maxD = -Infinity;
    let minF = Infinity, maxF = -Infinity;

    for await (const row of parser) {
      const alpha = parseFloat(row.mean_2_a) || 0;
      const beta = parseFloat(row.mean_3_a) || 0;
      const theta = parseFloat(row.mean_1_a) || 0;
      const delta = parseFloat(row.mean_0_a) || 0;
      const gamma = parseFloat(row.mean_4_a) || 0;

      const fft: number[] = [];
      for (let i = 0; i < 64; i++) {
        const val = Math.abs(parseFloat(row[`fft_${i}_a`])) || 0;
        fft.push(val);
        if (val < minF) minF = val;
        if (val > maxF) maxF = val;
      }

      if (alpha < minA) minA = alpha; if (alpha > maxA) maxA = alpha;
      if (beta < minB) minB = beta; if (beta > maxB) maxB = beta;
      if (theta < minT) minT = theta; if (theta > maxT) maxT = theta;
      if (gamma < minG) minG = gamma; if (gamma > maxG) maxG = gamma;
      if (delta < minD) minD = delta; if (delta > maxD) maxD = delta;

      rawRows.push({ alpha, beta, theta, gamma, delta, fft, label: row.label });
    }

    if (minA === Infinity) minA = -50; if (maxA === -Infinity) maxA = 150;
    if (minB === Infinity) minB = -50; if (maxB === -Infinity) maxB = 150;
    if (minT === Infinity) minT = -50; if (maxT === -Infinity) maxT = 150;
    if (minG === Infinity) minG = -50; if (maxG === -Infinity) maxG = 150;
    if (minD === Infinity) minD = -50; if (maxD === -Infinity) maxD = 150;
    if (minF === Infinity) minF = 0; if (maxF === -Infinity) maxF = 1000;

    const rows: PlaybackFrame[] = rawRows.map(r => ({
      alpha: this.normalize(r.alpha, minA, maxA),
      beta: this.normalize(r.beta, minB, maxB),
      theta: this.normalize(r.theta, minT, maxT),
      gamma: this.normalize(r.gamma, minG, maxG),
      delta: this.normalize(r.delta, minD, maxD),
      fft: r.fft.map((v: number) => this.normalize(v, minF, maxF)),
      label: r.label,
    }));

    this.data = rows;
    this.isLoaded = true;
    this.setLabel("NEUTRAL");
    console.log(`[dataset] Loaded ${this.data.length} rows from emotions.csv`);
  }

  private normalize(val: number, min: number, max: number): number {
    const n = (val - min) / (max - min);
    return Math.max(0, Math.min(1, n));
  }

  setLabel(label: string | null) {
    this.currentLabel = label;
    if (label) {
      this.filteredData = this.data.filter(d => d.label === label);
    } else {
      this.filteredData = this.data;
    }
    this.cursor = 0;
    this.currentFrame = this.filteredData[0] || null;
    this.nextFrame = this.filteredData[1] || null;
    this.blend = 0;
    console.log(`[dataset] Playback mode: ${label ?? "ALL"} (${this.filteredData.length} samples)`);
  }

  tick(): PlaybackFrame | null {
    if (!this.isLoaded || this.filteredData.length === 0) return null;
    if (!this.currentFrame || !this.nextFrame) return this.filteredData[0];

    // Increment blend
    this.blend += this.BLEND_SPEED;

    if (this.blend >= 1.0) {
      this.blend = 0;
      this.cursor = (this.cursor + 1) % this.filteredData.length;
      this.currentFrame = this.filteredData[this.cursor];
      this.nextFrame = this.filteredData[(this.cursor + 1) % this.filteredData.length];
    }

    // Interpolate values for smooth movement
    const t = this.blend;
    return {
      alpha: lerp(this.currentFrame.alpha, this.nextFrame.alpha, t),
      beta: lerp(this.currentFrame.beta, this.nextFrame.beta, t),
      theta: lerp(this.currentFrame.theta, this.nextFrame.theta, t),
      gamma: lerp(this.currentFrame.gamma, this.nextFrame.gamma, t),
      delta: lerp(this.currentFrame.delta, this.nextFrame.delta, t),
      fft: this.currentFrame.fft.map((val, i) => lerp(val, this.nextFrame!.fft[i], t)),
      label: this.currentFrame.label,
    };
  }

  getLabel() {
    return this.currentLabel;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
