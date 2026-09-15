import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Play" },
  { to: "/how-to-play", label: "How to play" },
  { to: "/levels", label: "Levels" },
  { to: "/characters", label: "Characters" },
  { to: "/about", label: "About" },
] as const;

export function PageLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="border-b border-glass-border bg-glass backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
          <Link to="/" className="font-display text-lg font-black tracking-tight">
            VERITY <span className="text-neon">DASH</span>
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-muted">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="transition hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="font-display text-4xl font-black leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base text-ink-muted">{intro}</p>
        <div className="mt-10 space-y-10">{children}</div>
      </main>

      <footer className="border-t border-glass-border px-5 py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 text-xs text-ink-faint">
          <p>© {new Date().getFullYear()} Verity Dash. Made for people who like their platformers on beat.</p>
          <nav className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/terms" className="hover:text-ink">Terms</Link>
            <Link to="/about" className="hover:text-ink">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-extrabold">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}
