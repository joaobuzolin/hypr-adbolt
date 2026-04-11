import { SUPABASE_FUNCTIONS_URL } from '@/services/supabase';

export interface SyncResult {
  synced: number;
  updated: number;
  deleted: number;
  xandr: number;
  dv360: number;
  mode?: 'pending' | 'full';
  errors?: Array<{ id: string; error: string }>;
}

/**
 * Trigger a creative sync via the creative-sync edge function.
 *
 * @param mode - 'pending' syncs only pending/partial/error (fast, for auto-sync)
 *               'full' syncs all active creatives (slow, for manual sync)
 */
export async function syncCreatives(token: string, mode: 'pending' | 'full' = 'pending'): Promise<SyncResult> {
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/creative-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ mode }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Sync failed');
  }

  return res.json();
}
