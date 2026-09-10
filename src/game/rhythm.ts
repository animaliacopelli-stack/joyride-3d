import { gridFromAnalysis, type BeatAnalysis, type BeatGrid } from "./beats";
import { levelById } from "./levels";
import { music } from "./music";
import { currentTempo, useGameStore } from "./store";

let cached: BeatGrid | null = null;
let key = "";

/** The beat grid in force right now (cached until any of its inputs change). */
export function resolveGrid(): BeatGrid {
  const s = useGameStore.getState();
  const def = levelById(s.levelId);
  const hasMusic = !!s.track && s.musicOn;
  const analysis: BeatAnalysis | null = hasMusic && music.currentId === s.track?.id ? music.analysis : null;
  const tempo = hasMusic ? currentTempo() : { bpm: null, offset: null };
  const duration = hasMusic ? music.duration : 3600;
  const k = `${s.track?.id ?? "-"}|${hasMusic}|${analysis ? 1 : 0}|${tempo.bpm}|${tempo.offset}|${def.bpm}|${duration}`;
  if (cached && k === key) return cached;
  key = k;
  cached = gridFromAnalysis(
    analysis,
    tempo.bpm !== null || tempo.offset !== null
      ? { bpm: tempo.bpm ?? undefined, offset: tempo.offset ?? undefined }
      : null,
    def.bpm,
    duration,
  );
  return cached;
}
