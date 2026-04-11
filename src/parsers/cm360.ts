import type { ParsedData, Placement } from '@/types';
import { cleanCR, extractBrand } from '@/lib/utils';

/**
 * Parse a CM360 tag export spreadsheet (as 2D array of rows).
 * Returns ParsedData or null if format not recognized.
 *
 * Ported from legacy: function parseCM360(rows) — lines 1745-1799
 */
export function parseCM360(rows: string[][]): ParsedData | null {
  let headerIdx = -1;
  const colMap: Record<string, number> = {};

  // Find header row by looking for "placement id" + "placement name"
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].map((c) => String(c || '').trim().toLowerCase());
    if (r.some((c) => c === 'placement id') && r.some((c) => c === 'placement name')) {
      headerIdx = i;
      r.forEach((v, j) => {
        if (v) colMap[v] = j;
      });
      break;
    }
  }

  if (headerIdx === -1) return null;

  // Extract metadata from rows above header
  let advertiserName = '';
  let campaignName = '';
  const skip = new Set([
    'contract information', 'advertiser id', 'advertiser name', 'campaign id',
    'campaign name', 'placement id', 'placement external id', 'site',
    'placement name', 'placement compatibility', 'dimensions', 'start date',
    'end date', 'trafficking instructions/notes',
  ]);

  for (let i = 0; i < headerIdx; i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const v = String(row[j] || '').trim();
      if (!v) continue;
      let fv = '';
      for (let k = j + 1; k < row.length; k++) {
        const c = String(row[k] || '').trim();
        if (!c) continue;
        if (skip.has(c.toLowerCase())) continue;
        fv = c;
        break;
      }
      if (v === 'Advertiser Name' && fv) advertiserName = fv;
      else if (v === 'Campaign Name' && fv) campaignName = fv;
    }
  }

  // Fallback: advertiser/campaign from data rows
  if (!advertiserName && colMap['advertiser name'] !== undefined) {
    const r = rows[headerIdx + 1];
    if (r) advertiserName = String(r[colMap['advertiser name']] || '').trim();
  }
  if (!campaignName && colMap['campaign name'] !== undefined) {
    const r = rows[headerIdx + 1];
    if (r) campaignName = String(r[colMap['campaign name']] || '').trim();
  }

  // Parse placement rows
  const placements: Placement[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const pid = String(row[colMap['placement id']] || '').trim();
    if (!pid) continue;

    const dim = String(row[colMap['dimensions']] || '').trim();
    const pn = String(row[colMap['placement name']] || '').trim();
    const anr = String(row[colMap['advertiser name']] || '').trim();
    const compat = colMap['placement compatibility'] !== undefined
      ? String(row[colMap['placement compatibility']] || '').trim().toLowerCase()
      : '';
    const isVideo = compat.includes('video') || compat.includes('in-stream');

    let jt = '';
    let vastTag = '';
    let placementType: 'display' | 'video' = 'display';

    if (isVideo) {
      placementType = 'video';
      // Prefer VAST 4.0 > 3.0 > 2.0
      const vastCols = ['vast 4.0 pre-fetch tag', 'vast 3.0 pre-fetch tag', 'vast 2.0 pre-fetch tag'];
      for (const vc of vastCols) {
        if (colMap[vc] !== undefined) {
          const v = cleanCR(String(row[colMap[vc]] || '').trim());
          if (v) { vastTag = v; break; }
        }
      }
      // Fallback: check if any column has a VAST-like URL
      if (!vastTag) {
        for (let c = 0; c < row.length; c++) {
          const v = String(row[c] || '').trim();
          if (v.includes('/pfadx/') || v.includes('/vast/') || v.includes('dcmt=text/xml')) {
            vastTag = cleanCR(v);
            break;
          }
        }
      }
      jt = vastTag;
    } else {
      if (colMap['javascript tag'] !== undefined) jt = String(row[colMap['javascript tag']] || '').trim();
      if (!jt && colMap['iframes/javascript tag'] !== undefined) jt = String(row[colMap['iframes/javascript tag']] || '').trim();
      jt = cleanCR(jt);
    }

    // Extract dimensions
    let finalDim = dim;
    if (!finalDim || finalDim === 'N/A' || finalDim === '0x0') {
      const dm = pn.match(/(\d{2,4})x(\d{2,4})/);
      if (dm) finalDim = dm[0];
      else if (isVideo) {
        const resDm = pn.match(/(\d{3,4})\s*[xX×]\s*(\d{3,4})/);
        if (resDm) finalDim = `${resDm[1]}x${resDm[2]}`;
        else finalDim = '0x0';
      }
    }

    // Click URL
    let cu = '';
    if (!isVideo) {
      if (colMap['internal redirect tag'] !== undefined) {
        for (const l of cleanCR(String(row[colMap['internal redirect tag']] || '')).split('\n')) {
          const t = l.trim();
          if (t.startsWith('https://ad.doubleclick.net/ddm/jump/')) { cu = t; break; }
        }
      }
      if (!cu && jt) {
        const m = jt.match(/data-dcm-placement='([^']+)'/);
        if (m) cu = `https://ad.doubleclick.net/ddm/jump/${m[1]};sz=${finalDim};dc_tdv=1`;
      }
    }

    if (!advertiserName && anr) advertiserName = anr;

    placements.push({
      placementId: pid,
      placementName: pn,
      dimensions: finalDim,
      jsTag: jt,
      clickUrl: cu,
      type: placementType,
      vastTag: isVideo ? vastTag : '',
      trackers: [],
    });
  }

  if (!placements.length) return null;

  const hasVideo = placements.some((p) => p.type === 'video');
  const hasDisplay = placements.some((p) => p.type === 'display');
  const contentType = hasVideo && hasDisplay ? 'mixed' : hasVideo ? 'video' : 'display';

  return {
    advertiserName,
    campaignName,
    brandName: extractBrand(advertiserName, campaignName),
    placements,
    contentType,
  };
}
