// Proxies the CM360 ad server response so the iframe that displays the
// creative loads from our own origin (adbolt.hypr.mobi/api/ad-proxy) instead
// of from ad.doubleclick.net directly. This removes browser cross-origin
// partitioning from the equation entirely — every successive preview open
// is, from Chrome's perspective, a navigation to a same-origin page, so
// there is no storage partitioning state to carry over from a previous load.
//
// The proxy hits the real ad server server-side, streams the HTML back, and
// adds a no-store cache header so nothing is reused between opens.

export const config = {
  runtime: 'edge',
};

// Locked to CM360 ad server paths. Accepting an arbitrary `url` parameter
// would let anyone use this endpoint as a generic proxy, which we do not want.
const AD_HOST = 'ad.doubleclick.net';
const ALLOWED_PREFIXES = ['/ddm/adi/', '/ddm/adj/', '/ddm/ad/'];

export default async function handler(request) {
  const url = new URL(request.url);
  const placement = url.searchParams.get('placement');
  const size = url.searchParams.get('sz');
  const ord = url.searchParams.get('ord') || String(Math.floor(Math.random() * 1e13));
  const kind = url.searchParams.get('kind') || 'adi';

  if (!placement || !/^[A-Za-z0-9._/-]+$/.test(placement)) {
    return new Response('invalid placement', { status: 400 });
  }
  if (size && !/^\d{1,4}x\d{1,4}$/.test(size)) {
    return new Response('invalid size', { status: 400 });
  }
  const path = `/ddm/${kind}/`;
  if (!ALLOWED_PREFIXES.includes(path)) {
    return new Response('invalid kind', { status: 400 });
  }

  const adUrl =
    `https://${AD_HOST}${path}${placement}`
    + (size ? `;sz=${size}` : '')
    + `;ord=${ord}?`;

  const upstream = await fetch(adUrl, {
    method: 'GET',
    headers: {
      'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': request.headers.get('accept-language') || 'pt-BR,pt;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'text/html; charset=UTF-8',
      // Each preview open must get a fresh response; never let the browser
      // keep one in memory/disk cache.
      'cache-control': 'no-store, no-cache, must-revalidate',
      'pragma': 'no-cache',
      // Allow embedding from our own origin; redundant but explicit.
      'x-frame-options': 'SAMEORIGIN',
    },
  });
}
