import type { Tracker, TrackerFormat, DspType } from '@/types';

/**
 * Analyze a raw tracker input (URL or HTML tag) and extract the URL + detect format.
 * Ported from legacy: function analyzeTracker(raw) — lines 1000-1030
 *
 * Accepts:
 * - Plain URLs (https://pixel.example.com/track.gif)
 * - <script src="..."> tags → extracts src, format = url-js
 * - Inline <script>...</script> blocks → format = raw-js
 * - <img src="..."> tags → extracts src, format = url-image
 * - data-3rd-tracker attributes
 * - <iframe src="..."> tags → format = url-html
 * - Fallback: extract any URL from the string
 */
export function analyzeTracker(raw: string): { url: string; format: TrackerFormat } {
  const t = raw.trim();

  // Pure URL (no HTML tags)
  if (!t.startsWith('<')) {
    const url = t;
    if (/\.js(\?|$)/i.test(url) || /\/js\//i.test(url)) return { url, format: 'url-js' };
    if (/\.html?(\?|$)/i.test(url)) return { url, format: 'url-html' };
    return { url, format: 'url-image' };
  }

  // <script src="..."> → JavaScript URL
  const scriptSrc = t.match(/<script[^>]+src=["']([^"']+)/i);
  if (scriptSrc) return { url: scriptSrc[1], format: 'url-js' };

  // Inline script block (no src) → Raw JavaScript
  const scriptClose = '<' + '/script>';
  const inlineScript = t.toLowerCase().includes(scriptClose.toLowerCase()) && !scriptSrc;
  if (inlineScript) return { url: t, format: 'raw-js' };

  // <img src="..."> → Image URL
  const imgSrc = t.match(/<img[^>]+src=["']([^"']+)/i);
  if (imgSrc) return { url: imgSrc[1], format: 'url-image' };

  // data-3rd-tracker attribute
  const dt = t.match(/data-3rd-tracker=["']([^"']+)/);
  if (dt) {
    const u = dt[1];
    if (/\.js(\?|$)/i.test(u)) return { url: u, format: 'url-js' };
    return { url: u, format: 'url-image' };
  }

  // iframe src → HTML URL
  const iframeSrc = t.match(/<iframe[^>]+src=["']([^"']+)/i);
  if (iframeSrc) return { url: iframeSrc[1], format: 'url-html' };

  // Fallback: extract any URL and classify
  const anyUrl = t.match(/(https?:\/\/[^\s"'<>]+)/);
  if (anyUrl) {
    const u = anyUrl[1];
    if (/\.js(\?|$)/i.test(u)) return { url: u, format: 'url-js' };
    if (/\.html?(\?|$)/i.test(u)) return { url: u, format: 'url-html' };
    return { url: u, format: 'url-image' };
  }

  // Nothing recognizable — treat as raw JS
  return { url: t, format: 'raw-js' };
}

/**
 * Merge trackers for a specific DSP, filtering by scope.
 * Ported from legacy: function mergeTrackers(trackerList, dsp) — line 1584
 */
export function mergeTrackers(trackerList: (string | Tracker)[], dsp: DspType): Tracker[] {
  const out: Tracker[] = [];

  for (const t of trackerList || []) {
    const tr: Tracker = typeof t === 'string'
      ? { url: t, format: 'url-image', dsps: 'all' }
      : t;

    const scope = tr.dsps || 'all';
    // Note: legacy data may have scope as arbitrary string (not just 'all' or DspType[])
    const inScope =
      scope === 'all' ||
      (Array.isArray(scope) && scope.includes(dsp)) ||
      (typeof scope === 'string' && (scope as string).includes(dsp));

    if (inScope && tr.url && !out.some((o) => o.url === tr.url)) {
      out.push({ url: tr.url, format: tr.format || 'url-image', dsps: tr.dsps, eventType: tr.eventType });
    }
  }

  return out;
}

/**
 * Extract just the URLs from merged trackers for a specific DSP.
 * Ported from legacy: function mergeTrackerUrls(trackerList, dsp) — line 1585
 */
export function mergeTrackerUrls(trackerList: (string | Tracker)[], dsp: DspType): string[] {
  return mergeTrackers(trackerList, dsp).map((t) => t.url);
}