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

// Amazon DSP THIRD-PARTY DISPLAY schema (row 2 in the official template).
// Kept here (not only in the blank) so unit tests can assert row shape
// without having to load the XLSX blob.
const AMAZON_HEADERS = [
  'Advertiser ID*', 'Creative Template*', 'Name*', 'Marketplace*',
  'Language*', 'Creative ID', 'External ID', 'Size*', 'Tag Source*',
  'Click-through destination*', 'Third party-impression URL',
  'AdChoices location', 'Additional html',
];

/**
 * Build the per-placement rows that belong to the THIRD-PARTY DISPLAY
 * sheet of Amazon DSP's bulk upload template.
 *
 * This function only produces the data; `fillAmazonDSPTemplate` is what
 * turns it into a downloadable XLSX by injecting the rows into the
 * official blank template. Separating the two keeps unit tests simple
 * (pure data transform) and lets the blank template evolve without
 * touching the placement-mapping logic.
 *
 * Only display creatives are included — Amazon's third-party display
 * sheet doesn't accept video placements (those go in VIDEO CREATIVES,
 * which AdBolt doesn't generate today).
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
          advertiserId, 'Third-party Display', p.placementName, marketplace, lang,
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

/**
 * Shape of a single cell in a parsed SheetJS worksheet. SheetJS exposes
 * cells as `{ t, v, ... }` and meta keys prefixed with `!` (like `!ref`).
 * We don't need to be fully precise here — just enough to mutate `!ref`.
 */
interface XLSXSheet {
  '!ref'?: string;
  [cellOrMeta: string]: unknown;
}

/**
 * Fill the official Amazon DSP bulk upload template with the given
 * placements and return it as a downloadable XLSX Blob.
 *
 * The blank template ships as a static asset at `/templates/amazondsp-blank.xlsx`.
 * It's a copy of the XLSX Amazon gives you from "Download blank XLSX template"
 * in the Amazon DSP UI, with every sample data row stripped out — but with
 * all 16 sheets (including the hidden `Template Info`, `validation list`,
 * `Don't Delete`, etc.) preserved. Amazon's bulk upload parser validates
 * against `Template Info` metadata, so generating a lookalike from scratch
 * with SheetJS's `book_new` gets silently rejected as an unrecognized
 * template — which is why the old generator (that did exactly that) broke.
 *
 * Placement rows go into the `THIRD-PARTY DISPLAY` sheet starting at A4:
 * row 1 is the "Required" markers, row 2 is the headers, row 3 is the
 * per-column tooltips, data begins on row 4. The worksheet range (`!ref`)
 * is extended to include the new rows so Excel and downstream parsers
 * treat them as part of the sheet.
 */
export async function fillAmazonDSPTemplate(
  placements: Placement[],
  advertiserId: string,
  marketplace: string,
): Promise<Blob> {
  const XLSX = window.XLSX;
  if (!XLSX) {
    throw new Error('SheetJS (XLSX) não carregou do CDN. Recarregue a página e tente novamente.');
  }

  const { rows } = genAmazonDSP(placements, advertiserId, marketplace);
  if (!rows.length) {
    throw new Error('Nenhum placement display para exportar — Amazon DSP não aceita vídeo nesse fluxo.');
  }

  // Pull the blank template from the static assets. It's ~190 kB so a
  // fresh fetch per download is fine; browsers will HTTP-cache it anyway.
  const resp = await fetch('/templates/amazondsp-blank.xlsx', { cache: 'force-cache' });
  if (!resp.ok) {
    throw new Error(`Falha ao carregar template blank da Amazon DSP (HTTP ${resp.status}).`);
  }
  const buf = await resp.arrayBuffer();

  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const ws = wb.Sheets['THIRD-PARTY DISPLAY'] as XLSXSheet | undefined;
  if (!ws) {
    throw new Error('Template blank da Amazon DSP está corrompido — sheet "THIRD-PARTY DISPLAY" não encontrada.');
  }

  // Inject placement rows at A4 (row 1-3 are header scaffolding in the blank).
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A4' });
  // Extend sheet range so Excel + parsers pick up the new rows.
  ws['!ref'] = `A1:M${3 + rows.length}`;

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
