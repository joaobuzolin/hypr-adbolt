import type { Placement } from '@/types';
import { STACKADAPT_EXCLUDED_SIZES } from '@/types';
import { mergeTrackerUrls } from '@/parsers/tracker';

export interface StackAdaptGeneratedFile {
  headers: string[];
  rows: string[][];
  type: 'xlsx';
  count: number;
  colWidths: Array<{ wch: number }>;
}

/**
 * Generate StackAdapt bulk upload XLSX data.
 * Filters out 336x280 (excluded by StackAdapt).
 *
 * Ported from legacy: function genSA(d, brand, pixel) — line 2138
 */
export function genStackAdapt(
  placements: Placement[],
  brandName: string,
  pixel: string,
): { file: StackAdaptGeneratedFile; excluded: number } {
  const filtered = placements.filter((p) => !STACKADAPT_EXCLUDED_SIZES.has(p.dimensions));
  const excluded = placements.length - filtered.length;

  const file: StackAdaptGeneratedFile = {
    headers: [
      'Creative Name', 'HTML or JS Code', 'Size', 'Click URL',
      'Sponsored By', 'Paid By', 'Impression Tracking URLs',
    ],
    rows: filtered.map((p) => {
      const pxUrls = mergeTrackerUrls(p.trackers || [], 'stackadapt');
      if (pixel && !pxUrls.includes(pixel)) pxUrls.unshift(pixel);
      const pxStr = p.isSurvey ? '' : (pxUrls.length ? '"' + pxUrls.join('\n') + '"' : '');
      return [p.placementName, p.jsTag, p.dimensions, p.clickUrl, brandName, '', pxStr];
    }),
    type: 'xlsx',
    count: filtered.length,
    colWidths: [{ wch: 40 }, { wch: 60 }, { wch: 12 }, { wch: 50 }, { wch: 20 }, { wch: 12 }, { wch: 60 }],
  };

  return { file, excluded };
}
