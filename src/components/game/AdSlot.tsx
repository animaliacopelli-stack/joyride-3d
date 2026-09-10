import { useEffect, useRef, useState } from "react";
import { ADSENSE_CLIENT, ADSENSE_SLOT, adsConfigured, loadAdSense } from "@/lib/ads";

/**
 * Ad space shown only on the menu / game-over screens — never during a run.
 * Renders nothing until AdSense ids are filled in (src/lib/ads.ts).
 */
export function AdSlot({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLModElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!adsConfigured()) return;
    let cancelled = false;
    loadAdSense()
      .then(() => {
        if (cancelled || !ref.current) return;
        const w = window as unknown as { adsbygoogle?: unknown[] };
        w.adsbygoogle = w.adsbygoogle ?? [];
        w.adsbygoogle.push({});
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!adsConfigured() || failed) return null;

  return (
    <div className={`overflow-hidden rounded-2xl border border-glass-border bg-glass p-2 backdrop-blur-xl ${className}`}>
      <p className="mb-1 text-center text-[10px] uppercase tracking-[0.22em] text-ink-faint">Advertisement</p>
      <ins
        ref={ref}
        className="adsbygoogle block"
        style={{ display: "block", minHeight: 100 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
