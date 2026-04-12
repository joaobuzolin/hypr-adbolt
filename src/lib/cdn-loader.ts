/**
 * Ensure a global CDN dependency is loaded.
 * If not available (CDN failure), attempts to reload it once before failing.
 */

const CDN_URLS: Record<string, string> = {
  XLSX: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  JSZip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
};

const loadAttempts = new Map<string, Promise<void>>();

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load: ${url}`));
    document.head.appendChild(script);
  });
}

/**
 * Get a global CDN dependency, retrying load if not present.
 * @throws Error with user-friendly message if dependency cannot be loaded
 */
export async function requireCdnLib<T>(name: 'XLSX' | 'JSZip'): Promise<T> {
  // Already loaded
  const existing = (window as unknown as Record<string, unknown>)[name];
  if (existing) return existing as T;

  // Try to load
  const url = CDN_URLS[name];
  if (!url) throw new Error(`Unknown CDN dependency: ${name}`);

  // Deduplicate concurrent load attempts
  if (!loadAttempts.has(name)) {
    loadAttempts.set(name, loadScript(url).catch(() => {
      // Retry once after 1s
      return new Promise<void>((r) => setTimeout(r, 1000)).then(() => loadScript(url));
    }));
  }

  try {
    await loadAttempts.get(name);
  } catch {
    loadAttempts.delete(name);
    throw new Error(
      `Não foi possível carregar ${name} do CDN. Verifique sua conexão e recarregue a página.`
    );
  }

  const loaded = (window as unknown as Record<string, unknown>)[name];
  if (!loaded) {
    throw new Error(`${name} não disponível após carregamento. Recarregue a página.`);
  }

  return loaded as T;
}
