/**
 * Offline beat analysis. Runs once per track on the decoded audio and yields
 * a tempo (BPM), the time of the first beat (offset) and a normalised onset
 * envelope used to pick heavier or lighter obstacles on each beat.
 */
export type BeatAnalysis = {
  bpm: number;
  offset: number;
  duration: number;
  confidence: number;
  /** 0..1 onset strength per frame. */
  envelope: Float32Array;
  /** seconds per envelope frame */
  frameSec: number;
};

const MIN_BPM = 70;
const MAX_BPM = 180;

export function analyzeBuffer(buf: AudioBuffer): BeatAnalysis {
  const sr = buf.sampleRate;
  const frame = 1024;
  const hop = 512;
  const n = buf.length;
  const frames = Math.max(1, Math.floor((n - frame) / hop));
  const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));

  // per-frame energy of the signal and of its high-passed version (transients)
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const start = f * hop;
    let e = 0;
    let hf = 0;
    for (const ch of chans) {
      let prev = ch[start] ?? 0;
      for (let i = start; i < start + frame; i++) {
        const x = ch[i] ?? 0;
        e += x * x;
        const d = x - prev;
        hf += d * d;
        prev = x;
      }
    }
    energy[f] = Math.log1p(e * 4 + hf * 12);
  }

  // onset = positive change vs local average
  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f++) {
    onset[f] = Math.max(0, energy[f]! - energy[f - 1]!);
  }
  // remove slow trend
  const win = Math.round((0.35 * sr) / hop);
  const smooth = new Float32Array(frames);
  let acc = 0;
  for (let f = 0; f < frames; f++) {
    acc += onset[f]!;
    if (f >= win) acc -= onset[f - win]!;
    smooth[f] = Math.max(0, onset[f]! - (acc / Math.min(f + 1, win)) * 0.9);
  }

  const fps = sr / hop;
  const minLag = Math.floor((60 * fps) / MAX_BPM);
  const maxLag = Math.ceil((60 * fps) / MIN_BPM);

  // autocorrelation-based tempo with a gentle prior around 125 BPM
  let bestLag = minLag;
  let bestScore = -1;
  const scores = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let f = lag; f < frames; f++) s += smooth[f]! * smooth[f - lag]!;
    // include the half-period harmonic so straight 4/4 tracks lock on
    const half = Math.round(lag / 2);
    let s2 = 0;
    if (half >= minLag) for (let f = half; f < frames; f++) s2 += smooth[f]! * smooth[f - half]!;
    const bpm = (60 * fps) / lag;
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 125) / 0.45, 2));
    const score = (s + 0.4 * s2) * (0.55 + 0.45 * prior);
    scores[lag] = score;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  // parabolic refinement of the peak
  let lag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const a = scores[bestLag - 1]!;
    const b = scores[bestLag]!;
    const c = scores[bestLag + 1]!;
    const denom = a - 2 * b + c;
    if (Math.abs(denom) > 1e-9) lag = bestLag + (0.5 * (a - c)) / denom;
  }
  let bpm = (60 * fps) / lag;
  while (bpm < 85) bpm *= 2;
  while (bpm > 175) bpm /= 2;
  bpm = Math.round(bpm * 10) / 10;
  const periodFrames = (60 * fps) / bpm;

  // phase: which offset lines the comb up best with the onsets
  let bestPhase = 0;
  let bestPhaseScore = -1;
  const steps = Math.max(8, Math.round(periodFrames));
  for (let i = 0; i < steps; i++) {
    const phase = (i / steps) * periodFrames;
    let s = 0;
    let count = 0;
    for (let p = phase; p < frames - 1; p += periodFrames) {
      const k = Math.floor(p);
      const t = p - k;
      s += smooth[k]! * (1 - t) + smooth[k + 1]! * t;
      count++;
    }
    s /= Math.max(1, count);
    if (s > bestPhaseScore) {
      bestPhaseScore = s;
      bestPhase = phase;
    }
  }

  // normalise envelope 0..1 by its 95th percentile
  const sorted = Array.from(smooth).sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const envelope = new Float32Array(frames);
  for (let f = 0; f < frames; f++) envelope[f] = Math.min(1, smooth[f]! / p95);
  let mean = 0;
  for (let f = 0; f < frames; f++) mean += smooth[f]!;
  mean /= frames;

  return {
    bpm,
    offset: bestPhase / fps,
    duration: buf.duration,
    confidence: Math.min(1, bestPhaseScore / (mean * 3 + 1e-6)),
    envelope,
    frameSec: 1 / fps,
  };
}

/** Decode any audio file (mp3/m4a/wav/ogg) to a mono 22.05 kHz buffer for analysis. */
export async function decodeForAnalysis(data: ArrayBuffer): Promise<AudioBuffer> {
  const Ctor =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  const ctx = new Ctor(1, 22050, 22050);
  const decoded = await ctx.decodeAudioData(data.slice(0));
  const MAX_SEC = 420; // analyse at most 7 minutes
  if (decoded.duration <= MAX_SEC) return decoded;
  const len = Math.floor(MAX_SEC * decoded.sampleRate);
  const trimmed = new AudioBuffer({
    length: len,
    numberOfChannels: 1,
    sampleRate: decoded.sampleRate,
  });
  trimmed.copyToChannel(decoded.getChannelData(0).subarray(0, len), 0);
  return trimmed;
}

/** The beat timeline for a track, taking any manual override into account. */
export type BeatGrid = {
  bpm: number;
  offset: number;
  /** track length in seconds; beats wrap every loop */
  duration: number;
  /** onset strength 0..1 at a (looped) song time */
  energyAt: (t: number) => number;
};

export function gridFromAnalysis(
  a: BeatAnalysis | null,
  override: { bpm?: number; offset?: number } | null,
  fallbackBpm: number,
  duration: number,
): BeatGrid {
  const bpm = override?.bpm ?? a?.bpm ?? fallbackBpm;
  const offset = (override?.offset ?? a?.offset ?? 0) + 0;
  const dur = a?.duration ?? duration;
  return {
    bpm,
    offset,
    duration: dur,
    energyAt: (t) => {
      if (!a) return 0.5;
      const local = ((t % a.duration) + a.duration) % a.duration;
      const f = Math.floor(local / a.frameSec);
      let s = 0;
      let c = 0;
      for (let i = f - 2; i <= f + 2; i++) {
        const v = a.envelope[i];
        if (v !== undefined) {
          s += v;
          c++;
        }
      }
      return c ? s / c : 0.5;
    },
  };
}
