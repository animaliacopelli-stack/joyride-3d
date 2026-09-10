/**
 * Google AdSense settings for Varity Dash.
 *
 * Paste the publisher id from your AdSense account (looks like "ca-pub-1234567890123456")
 * and the ad unit id you create there (a number like "1234567890").
 * Until both are filled in, no ads are shown — the game just runs without them.
 */
export const ADSENSE_CLIENT = "";
export const ADSENSE_SLOT = "";

export const adsConfigured = () => ADSENSE_CLIENT.startsWith("ca-pub-") && ADSENSE_SLOT.length > 0;

let loading: Promise<void> | null = null;

/** Loads the AdSense library once, on demand. */
export function loadAdSense(): Promise<void> {
  if (typeof document === "undefined" || !adsConfigured()) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-varity-ads]");
    if (existing) return resolve();
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
