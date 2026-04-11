import { SUPABASE_FUNCTIONS_URL } from '@/services/supabase';
import type { Placement, ActivationResult } from '@/types';
import { mergeTrackers } from '@/parsers/tracker';

interface XandrActivationConfig {
  advertiserId?: number;
  isPolitical: boolean;
  languageId: number;
  brandId: string;
  brandUrl: string;
  sla: number;
  campaignName: string;
  advertiserName: string;
}

/**
 * Activate 3P tag creatives in Xandr via the dsp-xandr edge function.
 * Ported from legacy: async function activateXandr(token) — lines 1261-1317
 */
export async function activateXandrTags(
  token: string,
  placements: Placement[],
  config: XandrActivationConfig,
): Promise<ActivationResult> {
  try {
    if (!placements.length) {
      return { dsp: 'Xandr', status: 'error', detail: 'Nenhum criativo pra ativar' };
    }

    const body = {
      advertiserId: config.advertiserId || 7392214,
      campaignName: config.campaignName,
      advertiserName: config.advertiserName,
      trackingPixel: '',
      isPolitical: config.isPolitical,
      languageId: config.languageId,
      brandId: config.brandId ? parseInt(config.brandId) : null,
      brandUrl: config.brandUrl || null,
      sla: config.sla,
      creatives: placements.map((p) => ({
        name: p.placementName,
        dimensions: p.dimensions,
        jsTag: p.jsTag,
        clickUrl: p.clickUrl || '',
        type: p.type || 'display',
        vastTag: p.vastTag || '',
        trackers: mergeTrackers(p.trackers || [], 'xandr'),
      })),
    };

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/dsp-xandr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return { dsp: 'Xandr', status: 'error', detail: data.error || 'Erro na requisição' };
    }

    return {
      dsp: 'Xandr',
      status: data.status,
      detail: `${data.success}/${data.total} criativos criados`,
      results: data.results,
    };
  } catch (err) {
    return { dsp: 'Xandr', status: 'error', detail: (err as Error).message || 'Erro de conexão' };
  }
}
