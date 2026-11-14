import { supabase } from './supabase';
import { GoalSeasonKey, SeasonGoal } from '../types';

const CHANGED_EVENT = 'season-goals-changed';

export async function listSeasonGoals(year: number): Promise<SeasonGoal[]> {
  const { data, error } = await supabase.from('season_goals').select('*').eq('year', year);
  if (error) throw error;
  return data ?? [];
}

export interface SeasonGoalInput {
  member_id: string;
  season_key: GoalSeasonKey;
  year: number;
  target_points: number;
  reward_label: string | null;
}

/**
 * Upserts targets and reward labels (earned_points is left alone, so progress
 * survives a target change) and deletes the goals listed in `remove`.
 */
export async function saveSeasonGoals(
  upserts: SeasonGoalInput[],
  remove: Pick<SeasonGoalInput, 'member_id' | 'season_key' | 'year'>[]
): Promise<void> {
  if (upserts.length > 0) {
    const { error } = await supabase
      .from('season_goals')
      .upsert(upserts, { onConflict: 'member_id,season_key,year' });
    if (error) throw error;
  }
  for (const goal of remove) {
    const { error } = await supabase
      .from('season_goals')
      .delete()
      .eq('member_id', goal.member_id)
      .eq('season_key', goal.season_key)
      .eq('year', goal.year);
    if (error) throw error;
  }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** Atomic increment, same pattern as increment_points; no-op when the member has no goal. */
export async function incrementSeasonGoal(
  memberId: string,
  seasonKey: GoalSeasonKey,
  year: number,
  points: number
): Promise<void> {
  const { error } = await supabase.rpc('increment_season_goal', {
    p_member_id: memberId,
    p_season_key: seasonKey,
    p_year: year,
    points_to_add: points,
  });
  if (error) throw error;
}

/** Lets the board reload goals right after Settings saves them. */
export function onSeasonGoalsChanged(callback: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, callback);
  return () => window.removeEventListener(CHANGED_EVENT, callback);
}
