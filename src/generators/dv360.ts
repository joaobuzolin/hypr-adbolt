import type { Placement } from '@/types';

export interface DV360GeneratedFile {
  headers: string[];
  rows: string[][];
  type: 'csv';
  files?: Record<string, { headers: string[]; rows: string[][]; type: string }>;
  displayCount: number;
  videoCount: number;
}

/**
 * Generate DV360 bulk upload CSV data.
 * Splits display and video into separate sections.
 *
 * Ported from legacy: function genDV360(d) — lines 2122-2136
 */
export function genDV360(placements: Placement[]): DV360GeneratedFile {
  const display = placements.filter((p) => p.type !== 'video');
  const video = placements.filter((p) => p.type === 'video');

  const files: Record<string, { headers: string[]; rows: string[][]; type: string }> = {};

  if (display.length) {
    files.display = {
      headers: [
        'Creative name', 'Dimensions (width x height)', 'Third-party tag',
        'Landing page URL (Optional)', 'Expanding direction',
        'Expands on hover ("Yes" or "No")', 'Requires HTML5 ("Yes" or "No")',
        'Requires MRAID ("Yes" or "No")', 'Campaign Manager 360 Tracking Placement ID',
        'Requires ping for attribution ("Yes" or "No")', 'Integration code (Optional)',
        'Notes (Optional)',
      ],
      rows: display.map((p) => {
        const [w, h] = p.dimensions.split('x');
        return [p.placementName, `${w} x ${h}`, p.jsTag, p.clickUrl, '', '', '', '', '', '', '', ''];
      }),
      type: 'csv',
    };
  }

  if (video.length) {
    files.video = {
      headers: ['Creative name', 'VAST tag URL', 'Integration code (Optional)', 'Notes (Optional)'],
      rows: video.map((p) => [p.placementName, p.vastTag || p.jsTag, '', '']),
      type: 'csv',
    };
  }

  // Combined format for backwards compat
  const allHeaders = [
    'Creative name', 'Dimensions (width x height)', 'Third-party tag',
    'VAST tag URL', 'Landing page URL (Optional)', 'Type',
    'Expanding direction', 'Expands on hover ("Yes" or "No")',
    'Requires HTML5 ("Yes" or "No")', 'Requires MRAID ("Yes" or "No")',
    'Campaign Manager 360 Tracking Placement ID',
    'Requires ping for attribution ("Yes" or "No")',
    'Integration code (Optional)', 'Notes (Optional)',
  ];
  const allRows: string[][] = [];
  display.forEach((p) => {
    const [w, h] = p.dimensions.split('x');
    allRows.push([p.placementName, `${w} x ${h}`, p.jsTag, '', p.clickUrl, 'display', '', '', '', '', '', '', '', '']);
  });
  video.forEach((p) => {
    allRows.push([p.placementName, '', '', p.vastTag || p.jsTag, '', 'video', '', '', '', '', '', '', '', '']);
  });

  return {
    headers: allHeaders,
    rows: allRows,
    type: 'csv',
    files,
    displayCount: display.length,
    videoCount: video.length,
  };
}
