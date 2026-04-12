/**
 * Retry wrapper for Edge Function fetch calls.
 * Retries on 502, 503, 504 (Supabase cold starts / timeouts) and network errors.
 * Does NOT retry on 4xx (client errors) or successful responses.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  const RETRYABLE_STATUSES = new Set([502, 503, 504]);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      if (res.ok || !RETRYABLE_STATUSES.has(res.status)) {
        return res;
      }

      // Retryable status — wait before next attempt
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn(`[retry] ${res.status} on attempt ${attempt + 1}, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        return res;
      }
    } catch (err) {
      // Network error (offline, DNS, etc.)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn(`[retry] Network error on attempt ${attempt + 1}, retrying in ${delay}ms...`, err);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('fetchWithRetry exhausted all attempts');
}
