export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function corsOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function corsError(message: string, status = 500): Response {
  return corsResponse({ error: message }, status);
}
