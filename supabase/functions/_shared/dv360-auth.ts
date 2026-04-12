import { encode as base64url } from "https://deno.land/std@0.208.0/encoding/base64url.ts";

const DV360_API = "https://displayvideo.googleapis.com/v4";

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function importPKCS8(pem: string): Promise<CryptoKey> {
  const b = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  return crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(b), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/**
 * Get a cached DV360 OAuth2 access token via service account JWT.
 * Refreshes automatically when expired.
 */
export async function getDV360Token(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const raw = Deno.env.get("DV360_SERVICE_ACCOUNT_KEY");
  if (!raw) throw new Error("DV360_SERVICE_ACCOUNT_KEY not configured");

  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();

  const hB = base64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const pB = base64url(
    enc.encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/display-video",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );

  const si = `${hB}.${pB}`;
  const key = await importPKCS8(sa.private_key);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(si));
  const jwt = `${si}.${base64url(new Uint8Array(sig))}`;

  const tr = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const td = await tr.json();
  if (!td.access_token) throw new Error("Google OAuth failed: " + JSON.stringify(td));

  cachedToken = td.access_token;
  tokenExpiry = Date.now() + (td.expires_in - 60) * 1000;
  return cachedToken!;
}

export { DV360_API };
