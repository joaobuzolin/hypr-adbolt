import type { Placement } from '@/types';
import { mergeTrackerUrls } from '@/parsers/tracker';

export interface XandrGeneratedFile {
  headers: string[];
  rows: string[][];
  type: 'xlsx';
  colWidths: Array<{ wch: number }>;
}

/**
 * Generate Xandr bulk upload XLSX data.
 * Ported from legacy: function genXandr(d, pixel, pol) — line 2140
 */
export function genXandr(
  placements: Placement[],
  pixel: string,
  isPolitical: boolean,
): XandrGeneratedFile {
  const pv = isPolitical ? 'Yes; non-EU' : 'No';

  return {
    headers: ['Creative Name', 'Secure Content', 'Size', 'Trackers', 'External Identifier', 'Political Declaration'],
    rows: placements.map((p) => {
      const pxUrls = mergeTrackerUrls(p.trackers || [], 'xandr');
      if (pixel && !pxUrls.includes(pixel)) pxUrls.unshift(pixel);
      const pxStr = p.isSurvey ? '' : pxUrls.join('\n');
      return [p.placementName, p.jsTag, p.dimensions, pxStr, '', pv];
    }),
    type: 'xlsx',
    colWidths: [{ wch: 40 }, { wch: 60 }, { wch: 12 }, { wch: 60 }, { wch: 20 }, { wch: 20 }],
  };
}
