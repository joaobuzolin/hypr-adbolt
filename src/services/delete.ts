import { SUPABASE_FUNCTIONS_URL } from '@/services/supabase';

export interface DeleteResult {
  deleted: number;
  archived: number;
  failed: number;
}

/**
 * Delete creatives via the creative-delete edge function.
 * Xandr creatives are permanently deleted, DV360 are archived.
 * Ported from legacy: bulkDeleteCreatives() — lines 3269-3329
 */
export async function deleteCreatives(
  token: string,
  creativeIds: string[],
): Promise<DeleteResult> {
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/creative-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ creativeIds }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Delete failed');
  }

  return {
    deleted: data.deleted || 0,
    archived: data.archived || 0,
    failed: data.failed || 0,
  };
}
