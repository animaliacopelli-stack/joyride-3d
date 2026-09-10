import { useRef, useState } from "react";
import { Activity, Loader2, RotateCcw } from "lucide-react";
import { currentTempo, useGameStore } from "@/game/store";
import { music } from "@/game/music";
import { Panel, Pill } from "./ui";

/** Detected tempo, plus manual BPM / offset controls when the ear disagrees. */
export function TempoPanel() {
  const track = useGameStore((s) => s.track);
  const tempoByTrack = useGameStore((s) => s.tempoByTrack);
  const detected = useGameStore((s) => s.detected);
  const analyzing = useGameStore((s) => s.analyzing);
  const setTempo = useGameStore((s) => s.setTempo);
  const taps = useRef<number[]>([]);
  const [tapMsg, setTapMsg] = useState<string | null>(null);

  if (!track) return null;
  void tempoByTrack;
  void detected;
  const tempo = currentTempo();
  const bpm = tempo.bpm ?? 120;
  const offsetMs = Math.round((tempo.offset ?? 0) * 1000);
  const override = tempoByTrack[track.id];

  const update = (patch: { bpm?: number; offset?: number }) => {
    setTempo(track.id, {
      bpm: patch.bpm ?? override?.bpm ?? (patch.offset !== undefined ? bpm : undefined),
      offset: patch.offset ?? override?.offset ?? (patch.bpm !== undefined ? tempo.offset ?? 0 : undefined),
    });
  };

  const tap = () => {
    const now = performance.now();
    const arr = taps.current;
    if (arr.length && now - arr[arr.length - 1]! > 2500) arr.length = 0;
    arr.push(now);
    if (arr.length > 10) arr.shift();
    if (arr.length >= 4) {
      const gaps = arr.slice(1).map((v, i) => v - arr[i]!);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const tapped = Math.round((60000 / avg) * 10) / 10;
      update({ bpm: tapped });
      setTapMsg(`${tapped} BPM from ${arr.length} taps`);
    } else {
      setTapMsg(`Keep tapping… ${arr.length}/4`);
    }
  };

  const syncNow = () => {
    // Put a beat exactly where the song is right now.
    const t = music.songTime();
    if (t === null) return;
    const period = 60 / bpm;
    const local = t % music.duration;
    update({ offset: Math.round((local % period) * 1000) / 1000 });
  };

  const conf = tempo.detected ? Math.round(tempo.detected.confidence * 100) : null;

  return (
    <Panel
      title="Tempo"
      icon={<Activity className="h-3.5 w-3.5" />}
      aside={
        override ? (
          <button
            onClick={() => setTempo(track.id, null)}
            className="flex items-center gap-1 text-[11px] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            <RotateCcw className="h-3 w-3" /> back to auto
          </button>
        ) : null
      }
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-3xl font-black tabular-nums text-ink">
            {Math.round(bpm * 10) / 10}
            <span className="ml-1 text-sm font-bold text-ink-muted">BPM</span>
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {analyzing ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> listening to the track…
              </span>
            ) : override ? (
              "manual tempo"
            ) : tempo.detected ? (
              `auto-detected · ${conf}% sure`
            ) : (
              "no beat found yet — set it by hand"
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-ink-faint">first beat</p>
          <p className="font-mono text-sm text-ink">{offsetMs} ms</p>
        </div>
      </div>

      <input
        type="range"
        min={60}
        max={200}
        step={0.5}
        value={Math.min(200, Math.max(60, bpm))}
        onChange={(e) => update({ bpm: Number(e.target.value) })}
        className="mt-3 w-full accent-[var(--sun)]"
        aria-label="Beats per minute"
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill onClick={() => update({ bpm: Math.round(bpm / 2 * 10) / 10 })}>÷2</Pill>
        <Pill onClick={() => update({ bpm: Math.round(bpm * 2 * 10) / 10 })}>×2</Pill>
        <Pill onClick={() => update({ bpm: Math.round((bpm - 1) * 10) / 10 })}>−1</Pill>
        <Pill onClick={() => update({ bpm: Math.round((bpm + 1) * 10) / 10 })}>+1</Pill>
        <Pill onClick={tap} active={taps.current.length > 0}>
          Tap tempo
        </Pill>
        <span className="mx-1 h-6 w-px bg-glass-border" />
        <Pill onClick={() => update({ offset: Math.max(0, (offsetMs - 20) / 1000) })}>beat −20ms</Pill>
        <Pill onClick={() => update({ offset: Math.max(0, (offsetMs - 5) / 1000) })}>−5ms</Pill>
        <Pill onClick={() => update({ offset: (offsetMs + 5) / 1000 })}>+5ms</Pill>
        <Pill onClick={() => update({ offset: (offsetMs + 20) / 1000 })}>beat +20ms</Pill>
        <Pill onClick={syncNow} disabled={!music.playing}>
          Beat is now
        </Pill>
      </div>
      {tapMsg && <p className="mt-2 text-[11px] text-ink-muted">{tapMsg}</p>}
      <p className="mt-2 text-[11px] leading-snug text-ink-faint">
        Every spike and ring is placed on a beat of this grid. The floor tiles under them flash when the beat lands,
        so nudge until the flashes match what you hear.
      </p>
    </Panel>
  );
}
