const TYPEFORM_PROXY = import.meta.env.VITE_TYPEFORM_PROXY ||
  'https://adfnabuwzmojxbhcpdpe.supabase.co/functions/v1/typeform-proxy';

/**
 * Extract a Typeform form ID from a URL or raw ID.
 * Ported from legacy: function extractFormId(url) — line 2077
 */
export function extractFormId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/typeform\.com\/to\/([a-zA-Z0-9]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9]{4,12}$/.test(url.trim())) return url.trim();
  return null;
}

/**
 * Fetch a Typeform title via the proxy edge function.
 * Ported from legacy: async function fetchTypeformTitle(formId) — line 2078
 */
export async function fetchTypeformTitle(formId: string): Promise<string> {
  const res = await fetch(`${TYPEFORM_PROXY}?form_id=${formId}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.title || formId;
}

/**
 * Detect survey variant (Controle/Exposto) from title.
 * Ported from legacy: function detectVariant(title) — line 2027
 */
export function detectVariant(title: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('controle') || t.includes('control')) return 'Controle';
  if (t.includes('exposto') || t.includes('exposed')) return 'Exposto';
  return '';
}

/**
 * Build an iframe tag for a Typeform survey.
 * Ported from legacy: function buildIframe(formId, size) — line 2080
 */
export function buildSurveyIframe(formId: string, size: string): string {
  const [w, h] = size.split('x');
  return `<iframe src="https://form.typeform.com/to/${formId}" width="${w}" height="${h}" frameborder="0" style="border:0;" allowfullscreen></iframe>`;
}
