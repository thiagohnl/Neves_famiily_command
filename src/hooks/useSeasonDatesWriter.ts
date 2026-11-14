import { useCallback, useRef } from 'react';
import { AppSettings, SeasonDatesByYear } from '../types';

export type SeasonDatesTransform = (current: unknown) => SeasonDatesByYear;
export type WriteSeasonDates = (transform: SeasonDatesTransform) => Promise<boolean>;

/**
 * Serialises writes to app_settings.season_dates. Several things write it on the
 * same tick (midnight auto-cross, the birthday goal bonus, a tap); each write
 * replaces the whole JSON, so each transform runs on the result of the previous
 * one instead of on a stale render's copy.
 */
export function useSeasonDatesWriter(
  settings: AppSettings,
  updateSettings: (updates: Partial<AppSettings>) => Promise<boolean>
): WriteSeasonDates {
  const latest = useRef<unknown>(settings.season_dates);
  const pending = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // Follow the saved settings, except while our own writes are in flight
  if (pending.current === 0) latest.current = settings.season_dates;

  const updateRef = useRef(updateSettings);
  updateRef.current = updateSettings;

  return useCallback((transform: SeasonDatesTransform) => {
    pending.current += 1;
    const run = queue.current.then(async () => {
      const next = transform(latest.current);
      const ok = await updateRef.current({ season_dates: next });
      if (ok) latest.current = next;
      return ok;
    }).finally(() => {
      pending.current -= 1;
    });
    queue.current = run.catch(() => undefined);
    return run;
  }, []);
}
