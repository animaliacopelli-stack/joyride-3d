import type { Track } from "@/lib/music.functions";
import { analyzeBuffer, decodeForAnalysis, type BeatAnalysis } from "./beats";

/** Turns a track into a URL the browser can both play and analyse. */
export function playableUrl(track: Track) {
  if (track.source === "apple") return `/api/public/audio?u=${encodeURIComponent(track.previewUrl)}`;
  return track.previewUrl;
}

/** Browser-only music player with an offline beat map and a live loudness analyser. */
class MusicEngine {
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array | null = null;
  private smooth = 0;
  private lastBeat = 0;
  private beatFlag = false;
  private loops = 0;
  private lastT = 0;
  private cache = new Map<string, BeatAnalysis>();
  private pending = new Map<string, Promise<BeatAnalysis | null>>();

  /** Analysis for the track currently loaded/playing. */
  analysis: BeatAnalysis | null = null;
  currentId: string | null = null;
  onAnalysis: ((id: string, a: BeatAnalysis | null, analyzing: boolean) => void) | null = null;

  get playing() {
    return !!this.audio && !this.audio.paused;
  }

  get duration() {
    return this.analysis?.duration ?? (this.audio?.duration || 30);
  }

  private ensureGraph(el: HTMLAudioElement) {
    if (this.ctx) return;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const src = this.ctx.createMediaElementSource(el);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.7;
      src.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
    } catch {
      this.ctx = null;
      this.analyser = null;
    }
  }

  /** Decode + analyse a track once; cached by id. */
  analyze(track: Track): Promise<BeatAnalysis | null> {
    if (typeof window === "undefined") return Promise.resolve(null);
    const hit = this.cache.get(track.id);
    if (hit) return Promise.resolve(hit);
    const inflight = this.pending.get(track.id);
    if (inflight) return inflight;
    this.onAnalysis?.(track.id, null, true);
    const p = (async () => {
      try {
        const res = await fetch(playableUrl(track));
        if (!res.ok) throw new Error("fetch failed");
        const buf = await res.arrayBuffer();
        const decoded = await decodeForAnalysis(buf);
        const a = analyzeBuffer(decoded);
        this.cache.set(track.id, a);
        if (this.currentId === track.id) this.analysis = a;
        this.onAnalysis?.(track.id, a, false);
        return a;
      } catch {
        this.onAnalysis?.(track.id, null, false);
        return null;
      } finally {
        this.pending.delete(track.id);
      }
    })();
    this.pending.set(track.id, p);
    return p;
  }

  async play(track: Track, volume = 0.7) {
    if (typeof window === "undefined") return;
    const url = playableUrl(track);
    this.currentId = track.id;
    this.analysis = this.cache.get(track.id) ?? null;
    void this.analyze(track);

    if (!this.audio || this.audio.dataset["src"] !== url) {
      this.stop();
      const el = new Audio();
      el.crossOrigin = "anonymous";
      el.src = url;
      el.loop = true;
      el.preload = "auto";
      el.dataset["src"] = url;
      this.audio = el;
      this.ensureGraph(el);
    }
    this.audio.volume = volume;
    this.audio.currentTime = 0;
    this.loops = 0;
    this.lastT = 0;
    try {
      await this.ctx?.resume();
      await this.audio.play();
    } catch {
      /* autoplay blocked until a gesture */
    }
  }

  /** Restart the current track from the top (used when a run starts). */
  async restart() {
    if (!this.audio) return;
    this.audio.currentTime = 0;
    this.loops = 0;
    this.lastT = 0;
    try {
      await this.ctx?.resume();
      await this.audio.play();
    } catch {
      /* ignore */
    }
  }

  pause() {
    this.audio?.pause();
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    this.loops = 0;
    this.lastT = 0;
  }

  /** Continuous song time in seconds (keeps counting across loops), or null when silent. */
  songTime(): number | null {
    if (!this.audio || this.audio.paused || !this.audio.duration) return null;
    const t = this.audio.currentTime;
    if (t < this.lastT - 0.5) this.loops++;
    this.lastT = t;
    return this.loops * this.audio.duration + t;
  }

  /** 0..1 loudness, smoothed, for the visuals. */
  level(t: number) {
    if (this.analyser && this.data && this.playing) {
      this.analyser.getByteFrequencyData(this.data as unknown as Uint8Array<ArrayBuffer>);
      let sum = 0;
      const bins = Math.min(48, this.data.length);
      for (let i = 0; i < bins; i++) sum += this.data[i]!;
      const raw = sum / (bins * 255);
      this.smooth += (raw - this.smooth) * 0.25;
      if (raw > this.smooth * 1.35 && raw > 0.18 && t - this.lastBeat > 0.22) {
        this.lastBeat = t;
        this.beatFlag = true;
      }
      return this.smooth;
    }
    if (this.playing) {
      const v = (Math.sin(t * 8) * 0.5 + 0.5) * 0.5;
      if (t - this.lastBeat > 0.5) {
        this.lastBeat = t;
        this.beatFlag = true;
      }
      return v;
    }
    this.smooth *= 0.9;
    return this.smooth;
  }

  /** True once per detected loudness spike (visual pulse). */
  consumeBeat() {
    if (!this.beatFlag) return false;
    this.beatFlag = false;
    return true;
  }
}

export const music = new MusicEngine();
