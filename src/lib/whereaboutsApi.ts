import { supabase } from './supabase';
import { Whereabout } from '../constants/whereabouts';
import { WhereaboutsOverride, WhereaboutsRule } from './whereabouts';

/** A tap on the clock holds for this long, then calendar inference takes over again. */
export const MANUAL_OVERRIDE_HOURS = 4;

/** Overrides that haven't expired yet (the resolver re-checks expiry every minute). */
export async function listActiveOverrides(): Promise<WhereaboutsOverride[]> {
  const { data, error } = await supabase
    .from('whereabouts_overrides')
    .select('*')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  if (error) throw error;
  return data ?? [];
}

export async function listRules(): Promise<WhereaboutsRule[]> {
  const { data, error } = await supabase
    .from('whereabouts_rules')
    .select('*')
    .order('priority', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Replace the member's manual override; `status` null just clears it. */
export async function setManualOverride(memberId: string, status: Whereabout | null): Promise<void> {
  const { error: deleteError } = await supabase
    .from('whereabouts_overrides')
    .delete()
    .eq('member_id', memberId)
    .eq('source', 'manual');
  if (deleteError) throw deleteError;
  if (!status) return;

  const expiresAt = new Date(Date.now() + MANUAL_OVERRIDE_HOURS * 3_600_000).toISOString();
  const { error } = await supabase
    .from('whereabouts_overrides')
    .insert({ member_id: memberId, status, source: 'manual', expires_at: expiresAt });
  if (error) throw error;
}

/** Calls `onChange` whenever any override row changes (phone presence, another device). */
export function subscribeToOverrides(onChange: () => void): () => void {
  try {
    const channel = supabase
      .channel('whereabouts-overrides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whereabouts_overrides' }, onChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  } catch (err) {
    // No realtime (offline, test client): the board still reloads on every refresh tick
    console.warn('Whereabouts realtime unavailable:', err);
    return () => {};
  }
}
