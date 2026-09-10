import { LEVELS } from "@/game/levels";
import { useGameStore } from "@/game/store";
import { THEMES } from "@/game/world";

const DIFF_COLOR: Record<string, string> = {
  Easy: "text-emerald-300",
  Normal: "text-sky-300",
  Hard: "text-amber-300",
  Insane: "text-rose-300",
};

export function LevelSelect() {
  const { levelId, setLevel, bestByLevel } = useGameStore();

  return (
    <div className="pointer-events-auto w-full">
      <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">Levels</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {LEVELS.map((l) => {
          const theme = THEMES[l.themeIndex % THEMES.length]!;
          const active = levelId === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              style={{ ["--lv" as string]: theme.grid }}
              className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                active
                  ? "border-[var(--lv)] bg-ink/10 shadow-[0_0_30px_-8px_var(--lv)]"
                  : "border-glass-border bg-glass hover:border-ink/40"
              }`}
            >
              <span
                className="absolute inset-x-0 top-0 h-0.5 opacity-80"
                style={{ background: l.rotateTheme ? "linear-gradient(90deg,#6ae1ff,#ffb45c,#5cffc8,#9fe8ff)" : theme.grid }}
              />
              <p className="font-display text-[13px] font-extrabold text-ink">{l.name}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-ink-muted">{l.subtitle}</p>
              <p className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider ${DIFF_COLOR[l.difficulty]}`}>
                {l.difficulty}
                {bestByLevel[l.id] ? <span className="text-ink-faint"> · {bestByLevel[l.id]} m</span> : null}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
