/**
 * Google AdSense settings for Varity Dash.
 *
 * Paste the publisher id from your AdSense account (looks like "ca-pub-1234567890123456")
 * and the ad unit id you create there (a number like "1234567890").
 * Until both are filled in, no ads are shown — the game just runs without them.
 */
export const ADSENSE_CLIENT = "ca-pub-3472886079351811";
export const ADSENSE_SLOT = "";

export const adsConfigured = () => ADSENSE_CLIENT.startsWith("ca-pub-") && ADSENSE_SLOT.length > 0;

let loading: Promise<void> | null = null;

/** Uses the verification script in the document head, with a fallback for older deployments. */
export function loadAdSense(): Promise<void> {
  if (typeof document === "undefined" || !adsConfigured()) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`,
    );
    if (existing) {
      if ((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle) resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("adsense blocked")), { once: true });
      }
      return;
    }
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.dataset["varityAds"] = "1";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("adsense blocked"));
    document.head.appendChild(s);
  });
  return loading;
}
