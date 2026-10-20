import { useMemo } from 'react';
import { Chore, FamilyMember } from '../types';
import { TodayItem } from '../types/today';
import { buildTodayItems } from '../lib/todayItems';
import { useBoardRefresh } from './useBoardRefresh';
import { useScheduleEvents } from './useScheduleEvents';
import { useGoogleCalendar } from './useGoogleCalendar';
import { useActivities } from './useActivities';
import { useFunIdeas } from './useFunIdeas';
import { useTodayMeal } from './useMeals';
import { useSeason } from './useSeason';
import { minutesOfDay, useNow } from './useNow';

export type { TodayItem } from '../types/today';

/**
 * Everything happening today as one list sorted by start time. Chores come from
 * App (pass its useChores state) so a completion shows up here immediately;
 * the other sources reload on the board refresh tick.
 */
export function useTodayItems(chores: Chore[], familyMembers: FamilyMember[]) {
  const { today } = useBoardRefresh();
  const now = useNow();
  const { todaysEvents } = useScheduleEvents(today);
  const { events: googleEvents } = useGoogleCalendar(today, today);
  const { activities, plannedActivities } = useActivities();
  const { ideas } = useFunIdeas();
  const { dinner } = useTodayMeal();
  const { rituals } = useSeason();
  const nowMinutes = minutesOfDay(now);

  const items: TodayItem[] = useMemo(
    () => buildTodayItems({
      today,
      chores,
      members: familyMembers,
      scheduleEvents: todaysEvents,
      googleEvents,
      activities,
      plannedActivities,
      funIdeas: ideas,
      dinner,
      rituals,
    }, nowMinutes),
    [today, chores, familyMembers, todaysEvents, googleEvents, activities, plannedActivities, ideas, dinner, rituals, nowMinutes]
  );

  return { items, dinner, nowMinutes };
}
