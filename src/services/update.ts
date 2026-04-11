import { SUPABASE_FUNCTIONS_URL } from '@/services/supabase';

export interface UpdateResult {
  success: boolean;
  creativeId: string;
  dsp: string;
  syncedToDsp: boolean;
  syncError: string | null;
  fieldsUpdated: string[];
}

/**
 * Update a creative (name, landing page, trackers, etc.) via the creative-update edge function.
 * The edge function syncs changes to the DSP API and records edits.
 * Ported from legacy: saveEdit() — lines 3615-3701
 */
export async function updateCreative(
  token: string,
  creativeId: string,
  changes: Record<string, unknown>,
): Promise<UpdateResult> {
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/creative-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ creativeId, changes }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.syncError || data.error || 'Update failed');
  }

  return data;
}
