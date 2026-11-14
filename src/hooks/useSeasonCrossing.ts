import { useCallback, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { SeasonState } from '../seasons';
import { missingCrossedDays, seasonCalendar } from '../seasons/calendar';
import { crossedDays, withCrossedDays } from '../seasons/store';
import { WriteSeasonDates } from './useSeasonDatesWriter';

/**
 * Crossing days off the season calendar, stored in
 * app_settings.season_dates[year][season].crossed_days. Owned by App, which holds
 * the settings. Past days that nobody crossed are crossed automatically once the
 * date rolls over (and on load, to catch up after the tablet slept).
 */
export function useSeasonCrossing(
  settings: AppSettings,
  writeSeasonDates: WriteSeasonDates,
  season: SeasonState,
  today: string
) {
  const { goalSeason, year, dates, translate } = season;
  const attempted = useRef<string | null>(null);

  const crossDay = useCallback(
    (day: string, crossed = true) => {
      if (!goalSeason) return;
      writeSeasonDates(current => withCrossedDays(current, year, goalSeason, [day], crossed));
    },
    [goalSeason, year, writeSeasonDates]
  );

  useEffect(() => {
    // Wait for the saved settings: writing before they load would replace them with defaults
    if (!settings.id || !goalSeason) return;
    // One attempt per day and season, so a failing save can't retry in a loop
    const key = `${today}|${goalSeason}`;
    if (attempted.current === key) return;
    const spec = seasonCalendar(goalSeason, dates, year, translate);
    if (!spec) return;
    const missing = missingCrossedDays(spec, crossedDays(settings.season_dates, year, goalSeason), today);
    attempted.current = key;
    if (missing.length > 0) {
      writeSeasonDates(current => withCrossedDays(current, year, goalSeason, missing));
    }
  }, [settings.id, settings.season_dates, goalSeason, year, dates, translate, today, writeSeasonDates]);

  const crossed = goalSeason ? crossedDays(settings.season_dates, year, goalSeason) : [];
  return { crossed, crossDay };
}
