import type { Placement } from '@/types';
import { mergeTrackerUrls } from '@/parsers/tracker';

export interface AmazonDSPGeneratedFile {
  headers: string[];
  rows: string[][];
  type: 'xlsx';
  sheetName: string;
  colWidths: Array<{ wch: number }>;
}

const MARKETPLACE_LANG: Record<string, string> = {
  BR: 'Portuguese', US: 'English', MX: 'Spanish', UK: 'English',
  DE: 'German', FR: 'French', ES: 'Spanish', IT: 'Italian',
  JP: 'Japanese', CA: 'English', AU: 'English', IN: 'English',
  NL: 'Dutch', SA: 'Arabic', SE: 'Swedish', TR: 'Turkish', AE: 'English',
};

const AMAZON_HEADERS = [
  'Advertiser ID*', 'Creative Template*', 'Name*', 'Marketplace*',
  'Language*', 'Creative ID', 'External ID', 'Size*', 'Tag Source*',
  'Click-through destination*', 'Third party-impression URL',
  'AdChoices location', 'Additional html',
];

/**
 * Build the per-placement rows for the Amazon DSP THIRD-PARTY DISPLAY
 * sheet. Kept here so tests can exercise the row shape directly.
 */
export function genAmazonDSP(
  placements: Placement[],
  advertiserId: string,
  marketplace: string,
): AmazonDSPGeneratedFile {
  const lang = MARKETPLACE_LANG[marketplace] || 'Portuguese';

  return {
    headers: AMAZON_HEADERS,
    rows: placements
      .filter((p) => p.type !== 'video')
      .map((p) => {
        const pxUrls = mergeTrackerUrls(p.trackers || [], 'amazondsp');
        return [
          advertiserId, 'Third party', p.placementName, marketplace, lang,
          '', '', p.dimensions, p.jsTag, 'Links to another website',
          pxUrls.join('\n'), '', '',
        ];
      }),
    type: 'xlsx',
    sheetName: 'THIRD-PARTY DISPLAY',
    colWidths: [
      { wch: 16 }, { wch: 18 }, { wch: 45 }, { wch: 15 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 60 }, { wch: 28 },
      { wch: 40 }, { wch: 16 }, { wch: 30 },
    ],
  };
}

const AMAZON_XLSX_ENDPOINT = 'https://adfnabuwzmojxbhcpdpe.supabase.co/functions/v1/adbolt-amazon-xlsx';

/**
 * Generate the final Amazon DSP XLSX server-side and return the downloadable blob.
 *
 * Why server-side:
 * The exact same JSZip 3.10.1 fill-and-repack logic, when run in the
 * browser, produced files that Excel flagged on open ("We found a problem
 * with some content") and that Amazon DSP rejected with "Bulk upload has
 * failed". The same code running in a Deno edge function produced files
 * that pass both checks â confirmed with three server-generated variants
 * the user successfully uploaded to Amazon. Rather than keep hunting the
 * browser-side gremlin (cache, CDN ordering, SheetJS/JSZip interaction,
 * Blob writer quirks, etc.), generation is delegated to Supabase edge
 * runtime where we know it works.
 *
 * The frontend posts only the per-row array. The edge function fetches
 * the latest official blank from /templates/amazondsp-blank.xlsx, runs the
 * surgical sheet4.xml row replacement, repacks with compression:DEFLATE
 * level 9, and streams the XLSX back. No JSZip call happens in the
 * browser anymore for this flow.
 */
export async function fillAmazonDSPTemplate(
  placements: Placement[],
  advertiserId: string,
  marketplace: string,
): Promise<Blob> {
  const { rows } = genAmazonDSP(placements, advertiserId, marketplace);
  if (!rows.length) {
    throw new Error('Nenhum placement display para exportar â Amazon DSP nÃ£o aceita vÃ­deo neste fluxo.');
  }
  if (rows.length > 91) {
    throw new Error(`Amazon DSP suporta no mÃ¡ximo 91 placements por template (recebi ${rows.length}).`);
  }

  const resp = await fetch(AMAZON_XLSX_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });

  if (!resp.ok) {
    let detail = '';
    try {
      const j = await resp.json() as { error?: string };
      detail = j?.error || '';
    } catch {
      detail = await resp.text();
    }
    throw new Error(`Falha ao gerar XLSX Amazon DSP (HTTP ${resp.status}): ${detail.slice(0, 300)}`);
  }

  return resp.blob();
}
