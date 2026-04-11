import { SUPABASE_FUNCTIONS_URL } from '@/services/supabase';

const TYPEFORM_PROXY = import.meta.env.VITE_TYPEFORM_PROXY ||
  `${SUPABASE_FUNCTIONS_URL}/typeform-proxy`;

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

/**
 * Parsed survey info extracted from a Typeform title.
 */
export interface TypeformSurvey {
  id: string;
  title: string;
  brand: string;
  type: string;
  variant: string;
  lastUpdated: string;
  url: string;
}

/**
 * Parse a Typeform survey title into brand, type, and variant.
 * Pattern: HYPR_Survey_{Brand parts}_{Type}_{Variant}_{Period}
 */
export function parseSurveyTitle(title: string): { brand: string; type: string; variant: string; displayName: string } {
  const variant = detectVariant(title);

  // Remove HYPR_Survey_ prefix
  let clean = title.replace(/^HYPR[_\s]*Survey[_\s]*/i, '');
  // Remove period suffixes like _Abr26, _Mar26
  clean = clean.replace(/[_\s]*(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\d{2}$/i, '');
  // Remove variant from end
  clean = clean.replace(/[_\s]*(Controle|Control|Exposto|Exposed)$/i, '');

  const parts = clean.split('_').filter(Boolean);

  // Known survey types
  const typeWords = new Set([
    'awareness', 'associacao', 'associação', 'atitude', 'favoritismo',
    'intencao', 'intenção', 'preferencia', 'preferência', 'probabilidade',
    'intent', 'consideration', 'recall', 'favorability',
  ]);

  // Walk from end to find the type, everything before is brand
  let typeIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (typeWords.has(parts[i].toLowerCase())) {
      typeIdx = i;
      break;
    }
  }

  let brand: string;
  let type: string;
  if (typeIdx > 0) {
    brand = parts.slice(0, typeIdx).join(' ');
    type = parts[typeIdx];
    // Capitalize first letter
    type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    // Fix common PT words
    if (type === 'Associacao') type = 'Associação';
    if (type === 'Intencao') type = 'Intenção';
    if (type === 'Preferencia') type = 'Preferência';
    if (type === 'Probabilidade') type = 'Probabilidade';
  } else {
    // Can't detect type — use last part as type, rest as brand
    brand = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    type = parts[parts.length - 1] || '';
  }

  // Remove common filler words from brand
  brand = brand.replace(/\b(Promo|Big|Flag|DarkTes)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
  if (!brand) brand = parts.length > 0 ? parts[0] : 'Desconhecido';

  return { brand, type, variant, displayName: clean.replace(/_/g, ' ') };
}

/**
 * Fetch the latest surveys from the Typeform workspace.
 */
export async function fetchSurveyList(pageSize = 50): Promise<TypeformSurvey[]> {
  const res = await fetch(`${TYPEFORM_PROXY}?action=list&page_size=${pageSize}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();

  return (data.forms || []).map((f: { id: string; title: string; last_updated_at: string; url: string }) => {
    const parsed = parseSurveyTitle(f.title);
    return {
      id: f.id,
      title: f.title,
      brand: parsed.brand,
      type: parsed.type,
      variant: parsed.variant,
      lastUpdated: f.last_updated_at,
      url: f.url,
    };
  });
}
