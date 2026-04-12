const XANDR_API = "https://api.appnexus.com";

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Get a cached Xandr API token. Refreshes automatically when expired.
 * Token is cached for 110 minutes (Xandr tokens last 2 hours).
 */
export async function getXandrToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const username = Deno.env.get("XANDR_USERNAME");
  const password = Deno.env.get("XANDR_PASSWORD");
  if (!username || !password) throw new Error("XANDR credentials not configured");

  const res = await fetch(`${XANDR_API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth: { username, password } }),
  });

  const data = await res.json();
  if (!data.response?.token) {
    throw new Error(`Xandr auth failed: ${data.response?.error_message || JSON.stringify(data.response || data)}`);
  }

  cachedToken = data.response.token;
  tokenExpiry = Date.now() + 110 * 60 * 1000;
  return cachedToken!;
}

export { XANDR_API };
export const MEMBER_ID = 14843;
