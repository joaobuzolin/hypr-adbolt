/**
 * Remove CM360 carriage return artifacts from tag strings.
 * Ported from legacy: function cleanCR(s)
 */
export function cleanCR(s: string): string {
  return s.replace(/_x000d_/gi, '').replace(/\r/g, '');
}

/**
 * Normalize a URL by prepending https:// if it looks like a domain but lacks a scheme.
 * Ported from legacy: function normalizeUrl(v)
 */
export function normalizeUrl(v: string): string {
  let url = v.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url) && /^[a-zA-Z0-9]/.test(url) && url.includes('.')) {
    url = 'https://' + url;
  }
  return url;
}

/**
 * Format bytes into human-readable string (B, KB, MB).
 * Ported from legacy: function formatBytes(b)
 */
export function formatBytes(b: number): string {
  if (b < 1024) return b + 'B';
  if (b < 1048576) return (b / 1024).toFixed(0) + 'KB';
  return (b / 1048576).toFixed(1) + 'MB';
}

/**
 * Extract brand name from advertiser/campaign strings.
 * Ported from legacy: function extractBrand(a, c) — lines 1800
 */
export function extractBrand(advertiser: string, campaign: string): string {
  let b = advertiser;
  const m = b.match(/^PUB_[A-Z]+_[A-Z]{2,4}_(.+)$/i);
  if (m) b = m[1];
  if (!b || b.length < 2) {
    const p = campaign.match(/\|\s*(.+)/);
    if (p) b = p[1].trim();
  }
  return b || advertiser;
}

/**
 * Apply rename pattern to a name.
 * Supports prefix/suffix or full pattern with {name}, {size}, {type}, {index} placeholders.
 */
export function getRenamedName(
  original: string,
  prefix: string,
  suffix: string,
  pattern: string,
  index: number,
  meta: { dimensions?: string; type?: string },
): string {
  if (pattern) {
    return pattern
      .split('{name}').join(original)
      .split('{size}').join(meta.dimensions || '')
      .split('{type}').join(meta.type || '')
      .split('{index}').join(String(index + 1));
  }
  return (prefix || '') + original + (suffix || '');
}
