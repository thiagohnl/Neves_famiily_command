import { useCallback, useEffect, useState } from 'react';
import { GoalSeasonKey, SeasonGoal } from '../types';
import { listSeasonGoals, onSeasonGoalsChanged } from '../lib/seasonGoalsApi';
import { useBoardRefresh } from './useBoardRefresh';

/**
 * Points goals for the year (all seasons). Reloads on the board refresh tick and
 * whenever Settings saves goals. `bump` shows a completion before the reload.
 */
export function useSeasonGoals(year: number) {
  const { tick } = useBoardRefresh();
  const [goals, setGoals] = useState<SeasonGoal[]>([]);

  const load = useCallback(async () => {
    try {
      setGoals(await listSeasonGoals(year));
    } catch (err) {
      // Table missing (migration not applied yet) or offline: show no goals
      console.error('Error loading season goals:', err);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load, tick]);

  useEffect(() => onSeasonGoalsChanged(load), [load]);

  const bump = useCallback((memberId: string, seasonKey: GoalSeasonKey, points: number) => {
    setGoals(prev =>
      prev.map(g => (g.member_id === memberId && g.season_key === seasonKey ? { ...g, earned_points: g.earned_points + points } : g))
    );
  }, []);

  return { goals, reload: load, bump };
}
