import { createContext, useContext, useMemo } from 'react';
import { AppSettings, FamilyMember } from '../types';
import { NO_SEASON, resolveSeasonState, SeasonState } from '../seasons';

export const SeasonContext = createContext<SeasonState>(NO_SEASON);

/** The active season with its hero, today's rituals and palette. */
export const useSeason = () => useContext(SeasonContext);

/**
 * Owned once by App, which already holds the settings and members. Calling
 * useAppSettings/useChores again here would create a second copy of that state
 * that never sees a save from the Settings modal.
 */
export function useSeasonSource(
  settings: AppSettings,
  familyMembers: FamilyMember[],
  today: string
): SeasonState {
  const { active_season, season_dates, language } = settings;
  return useMemo(
    () => resolveSeasonState({ active_season, season_dates, language }, today, familyMembers),
    [active_season, season_dates, language, today, familyMembers]
  );
}
