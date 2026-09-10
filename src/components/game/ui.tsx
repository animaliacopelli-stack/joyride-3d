import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Panel({
  title,
  icon,
  aside,
  children,
  className = "",
}: {
  title?: string;
  icon?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`pointer-events-auto w-full rounded-2xl border border-glass-border bg-glass p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl ${className}`}
    >
      {title && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">
            {icon}
            {title}
          </h2>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

export function Pill({
  active,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-ink bg-ink/15 text-ink"
          : "border-glass-border text-ink-muted hover:border-ink/60 hover:text-ink"
      } ${className}`}
    />
  );
}

export function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-w-0 rounded-lg border border-glass-border bg-ink/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink/50 ${props.className ?? ""}`}
    />
  );
}
