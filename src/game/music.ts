/** Browser-only music player with a beat/energy analyser. */
class MusicEngine {
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array | null = null;
  private smooth = 0;
  private lastBeat = 0;
  private beatFlag = false;

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

  async play(url: string, volume = 0.7) {
    if (typeof window === "undefined") return;
    if (!this.audio || this.audio.dataset["src"] !== url) {
      this.stop();
      const el = new Audio();
      el.crossOrigin = "anonymous";
      el.src = url;
      el.loop = true;
      el.dataset["src"] = url;
      this.audio = el;
      this.ensureGraph(el);
    }
    this.audio.volume = volume;
    this.audio.currentTime = 0;
    try {
      await this.ctx?.resume();
      await this.audio.play();
    } catch {
      /* autoplay blocked until a gesture */
    }
  }

  pause() {
    this.audio?.pause();
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
  }

  /** 0..1 loudness, smoothed. Falls back to a synthetic pulse without analysis. */
  level(t: number) {
    if (this.analyser && this.data) {
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
    if (this.audio && !this.audio.paused) {
      const v = (Math.sin(t * 8) * 0.5 + 0.5) * 0.5;
      if (t - this.lastBeat > 0.5) {
        this.lastBeat = t;
        this.beatFlag = true;
      }
      return v;
    }
    return 0;
  }

  /** True once per detected beat. */
  consumeBeat() {
    if (!this.beatFlag) return false;
    this.beatFlag = false;
    return true;
  }
}

export const music = new MusicEngine();
