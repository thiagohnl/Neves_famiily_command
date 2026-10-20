import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FamilyMember } from '../types';
import { TodayItem } from '../types/today';
import { Whereabout } from '../constants/whereabouts';
import { resolveWhereabouts, WhereaboutsOverride, WhereaboutsRule } from '../lib/whereabouts';
import { listActiveOverrides, listRules, setManualOverride, subscribeToOverrides } from '../lib/whereaboutsApi';
import { useBoardRefresh } from './useBoardRefresh';
import { useSeason } from './useSeason';
import { useNow } from './useNow';

/**
 * Where everyone is. Overrides and rules reload on the board refresh tick and
 * overrides also on every realtime change, so a phone's presence update moves
 * the hand within seconds. `todayItems` come from the caller's useTodayItems
 * (HomeBoard already has them; a second call would fetch every source twice).
 */
export function useWhereabouts(familyMembers: FamilyMember[], todayItems: TodayItem[]) {
  const { tick } = useBoardRefresh();
  const { season } = useSeason();
  const now = useNow();
  const [overrides, setOverrides] = useState<WhereaboutsOverride[]>([]);
  const [rules, setRules] = useState<WhereaboutsRule[]>([]);

  const loadOverrides = useCallback(() => {
    listActiveOverrides().then(setOverrides).catch(err => console.error('Error loading whereabouts:', err));
  }, []);

  useEffect(() => {
    loadOverrides();
    listRules().then(setRules).catch(err => console.error('Error loading whereabouts rules:', err));
  }, [tick, loadOverrides]);

  useEffect(() => subscribeToOverrides(loadOverrides), [loadOverrides]);

  const whereabouts = useMemo(
    () => resolveWhereabouts(familyMembers, overrides, rules, todayItems, now, season?.clockEmoji),
    [familyMembers, overrides, rules, todayItems, now, season]
  );

  const setStatus = useCallback(async (memberId: string, status: Whereabout | null) => {
    try {
      await setManualOverride(memberId, status);
      loadOverrides();
    } catch (err) {
      console.error('Error saving whereabouts:', err);
      toast.error("Couldn't save that, try again");
    }
  }, [loadOverrides]);

  return { whereabouts, setStatus };
}
