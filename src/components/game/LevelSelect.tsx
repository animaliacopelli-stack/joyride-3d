import { LEVELS } from "@/game/levels";
import { useGameStore } from "@/game/store";

const DIFF_COLOR: Record<string, string> = {
  Easy: "text-emerald-300",
  Normal: "text-sky-300",
  Hard: "text-amber-300",
  Insane: "text-rose-300",
};

export function LevelSelect() {
  const { levelId, setLevel, bestByLevel } = useGameStore();

  return (
    <div className="pointer-events-auto w-full max-w-xl">
      <p className="mb-2 text-center text-[11px] uppercase tracking-[0.2em] text-white/40">Levels</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className={`rounded-xl border p-3 text-left transition ${
              levelId === l.id
                ? "border-white bg-white/15"
                : "border-white/15 bg-black/40 hover:border-white/40"
            }`}
          >
            <p className="text-sm font-bold text-white">{l.name}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-white/50">{l.subtitle}</p>
            <p className={`mt-1.5 text-[10px] font-semibold uppercase ${DIFF_COLOR[l.difficulty]}`}>
              {l.difficulty}
              {bestByLevel[l.id] ? ` · best ${bestByLevel[l.id]} m` : ""}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
