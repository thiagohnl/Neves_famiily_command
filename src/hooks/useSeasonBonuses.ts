import { useCallback, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { SeasonState } from '../seasons';
import { BIRTHDAY_GOAL_BONUS, goalBonusKey } from '../seasons/birthdays';
import { bonusesDone, withBonusDone } from '../seasons/store';
import { incrementSeasonGoal } from '../lib/seasonGoalsApi';
import { WriteSeasonDates } from './useSeasonDatesWriter';

/**
 * Bookkeeping for generated chores in app_settings.season_dates[year].bonuses.done,
 * owned by App (which holds the settings):
 * - `markDone(choreId)` records a finished generated chore (a birthday gift, the
 *   wellies on a shoe night) so it shows as done and can't be completed twice.
 * - On the day, the birthday member's running season goal gets +50 once. The key
 *   is recorded before the increment, so a retry can never pay out twice.
 */
export function useSeasonBonuses(
  settings: AppSettings,
  writeSeasonDates: WriteSeasonDates,
  season: SeasonState,
  today: string
) {
  const { birthdayIds, goalSeason, year } = season;
  const attempted = useRef<string | null>(null);

  const markDone = useCallback(
    (choreId: string) => writeSeasonDates(current => withBonusDone(current, year, [choreId])),
    [year, writeSeasonDates]
  );

  useEffect(() => {
    // Wait for the saved settings, or a write would replace them with defaults
    if (!settings.id || !goalSeason || birthdayIds.length === 0) return;
    const attemptKey = `${today}|${goalSeason}|${birthdayIds.join(',')}`;
    if (attempted.current === attemptKey) return;
    attempted.current = attemptKey;

    const done = bonusesDone(settings.season_dates, year);
    const due = birthdayIds.filter(id => !done.includes(goalBonusKey(id, today)));
    if (due.length === 0) return;
    (async () => {
      const saved = await writeSeasonDates(current => withBonusDone(current, year, due.map(id => goalBonusKey(id, today))));
      if (!saved) return;
      for (const memberId of due) {
        try {
          await incrementSeasonGoal(memberId, goalSeason, year, BIRTHDAY_GOAL_BONUS);
        } catch (err) {
          console.error('Error adding the birthday goal bonus:', err);
        }
      }
    })();
  }, [settings.id, settings.season_dates, birthdayIds, goalSeason, year, today, writeSeasonDates]);

  return { markDone };
}
