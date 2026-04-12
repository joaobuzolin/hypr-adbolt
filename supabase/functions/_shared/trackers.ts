/**
 * Detect tracker pixel format from URL or tag string.
 */
export function detectPixelFormat(url: string): string {
  const lower = url.toLowerCase();
  if (lower.startsWith("<script") && !lower.includes("src=")) return "raw-js";
  if (lower.endsWith(".js") || lower.includes(".js?") || lower.includes("/js/")) return "url-js";
  if (lower.includes(".html")) return "url-html";
  return "url-image";
}

/**
 * Normalize a tracker input (string or object) into {url, format}.
 */
export function normalizeTrackerInput(
  t: unknown,
): { url: string; format: string; eventType?: string } {
  if (typeof t === "string") return { url: t, format: detectPixelFormat(t) };
  const obj = t as { url?: string; format?: string; eventType?: string };
  return {
    url: obj.url || "",
    format: obj.format || detectPixelFormat(obj.url || ""),
    eventType: obj.eventType,
  };
}
