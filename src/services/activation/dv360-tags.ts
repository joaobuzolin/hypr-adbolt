import { SUPABASE_FUNCTIONS_URL } from '@/services/supabase';
import type { Placement, ActivationResult } from '@/types';
import { mergeTrackers } from '@/parsers/tracker';

/**
 * Activate 3P tag creatives in DV360 via the dsp-dv360 edge function.
 * Ported from legacy: async function activateDV360(token) — lines 1319-1362
 */
export async function activateDV360Tags(
  token: string,
  placements: Placement[],
  config: { advertiserId: string; campaignName: string; advertiserName: string },
): Promise<ActivationResult> {
  try {
    if (!placements.length) {
      return { dsp: 'DV360', status: 'error', detail: 'Nenhum criativo pra ativar' };
    }

    const body = {
      advertiserId: config.advertiserId || '1426474713',
      campaignName: config.campaignName,
      advertiserName: config.advertiserName,
      creatives: placements.map((p) => ({
        name: p.placementName,
        dimensions: p.dimensions,
        jsTag: p.jsTag,
        clickUrl: p.clickUrl || '',
        type: p.type || 'display',
        vastTag: p.vastTag || '',
        trackers: mergeTrackers(p.trackers || [], 'dv360'),
      })),
    };

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/dsp-dv360`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return { dsp: 'DV360', status: 'error', detail: data.error || 'Erro na requisição' };
    }

    return {
      dsp: 'DV360',
      status: data.status,
      detail: `${data.success}/${data.total} criativos criados`,
      results: data.results,
    };
  } catch (err) {
    return { dsp: 'DV360', status: 'error', detail: (err as Error).message || 'Erro de conexão' };
  }
}
