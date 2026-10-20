import { AppSettings, FamilyMember, SeasonDates } from '../types';
import { TodayItem } from '../types/today';
import { HeroSpec, Season, SeasonPalette } from './types';
import { sinterklaas } from './sinterklaas';
import { christmas } from './christmas';
import { birthdaySeason } from './birthdays';
import { translatorFor } from './i18n';

export type { Season, HeroSpec, SeasonPalette } from './types';
export { t } from './i18n';

/** Date-driven seasons, in priority order (a birthday is checked before these). */
export const SEASONS: Season[] = [sinterklaas, christmas];

/** Values `active_season` can take besides null (auto). */
export const SEASON_OVERRIDES = [
  { value: 'sinterklaas', label: 'Sinterklaas' },
  { value: 'christmas', label: 'Christmas' },
  { value: 'none', label: 'None' },
] as const;

type SeasonSettings = Pick<AppSettings, 'active_season' | 'season_dates' | 'language'>;

/**
 * Manual override if set ('none' forces no season), else the first season active
 * today: a birthday first since it lasts one day, then Sinterklaas, then Christmas.
 */
export const getActiveSeason = (
  settings: Pick<SeasonSettings, 'active_season' | 'season_dates'>,
  today: string,
  members: FamilyMember[]
): Season | null => {
  const override = settings.active_season;
  if (override === 'none') return null;
  const forced = SEASONS.find(s => s.key === override);
  if (forced) return forced;

  const dates: SeasonDates = settings.season_dates ?? {};
  const candidates = [birthdaySeason(members, today), ...SEASONS];
  return candidates.find(s => s && s.isActive(today, dates)) ?? null;
};

export interface SeasonState {
  season: Season | null;
  hero: HeroSpec | null;
  rituals: TodayItem[];
  palette: SeasonPalette | null;
}

export const NO_SEASON: SeasonState = { season: null, hero: null, rituals: [], palette: null };

export const resolveSeasonState = (
  settings: SeasonSettings,
  today: string,
  members: FamilyMember[]
): SeasonState => {
  const season = getActiveSeason(settings, today, members);
  if (!season) return NO_SEASON;
  const dates = settings.season_dates ?? {};
  const translate = translatorFor(settings.language);
  return {
    season,
    hero: season.hero?.(today, dates, translate) ?? null,
    rituals: season.rituals(today, dates, translate),
    palette: season.palette,
  };
};
