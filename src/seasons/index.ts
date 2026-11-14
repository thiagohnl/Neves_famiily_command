import { AppSettings, FamilyMember, GoalSeasonKey, SeasonDates } from '../types';
import { TodayItem } from '../types/today';
import { EMPTY_HERO_CONTEXT, HeroContext, HeroSpec, Season, SeasonPalette } from './types';
import { sinterklaas } from './sinterklaas';
import { christmas } from './christmas';
import { birthdaySeason } from './birthdays';
import { Translate, translatorFor } from './i18n';
import { datesForYear } from './store';

export type { Season, HeroSpec, SeasonPalette, HeroContext } from './types';
export { t } from './i18n';

/** Date-driven seasons, in priority order (a birthday is checked before these). */
export const SEASONS: Season[] = [sinterklaas, christmas];

/** Seasons with a calendar under the clock and points goals. */
export const GOAL_SEASONS: { key: GoalSeasonKey; label: string; emoji: string }[] = [
  { key: 'sinterklaas', label: 'Sinterklaas', emoji: '🎁' },
  { key: 'christmas', label: 'Christmas', emoji: '🎄' },
];

/** Values `active_season` can take besides null (auto). */
export const SEASON_OVERRIDES = [
  { value: 'sinterklaas', label: 'Sinterklaas' },
  { value: 'christmas', label: 'Christmas' },
  { value: 'none', label: 'None' },
] as const;

type SeasonSettings = Pick<AppSettings, 'active_season' | 'season_dates' | 'language'>;

const yearOf = (today: string) => Number(today.slice(0, 4));

/**
 * Sinterklaas or Christmas, whichever runs today (or is forced), ignoring birthdays.
 * Drives the season calendar and points goals, which carry on through a birthday.
 */
export const getGoalSeason = (
  settings: Pick<SeasonSettings, 'active_season' | 'season_dates'>,
  today: string
): Season | null => {
  const override = settings.active_season;
  if (override === 'none') return null;
  const forced = SEASONS.find(s => s.key === override);
  if (forced) return forced;
  const dates = datesForYear(settings.season_dates, yearOf(today));
  return SEASONS.find(s => s.isActive(today, dates)) ?? null;
};

/**
 * Manual override if set ('none' forces no season), else the first season active
 * today: a birthday first since it lasts one day, then Sinterklaas, then Christmas.
 * Sinterklaas dates are computed for the year unless a parent set them.
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
  return birthdaySeason(members, today) ?? getGoalSeason(settings, today);
};

export interface SeasonState {
  season: Season | null;
  hero: HeroSpec | null;
  /** The hero with what the board knows (today's calendar, children's goals). */
  heroFor: (ctx: HeroContext) => HeroSpec | null;
  rituals: TodayItem[];
  palette: SeasonPalette | null;
  /** This year's dates with computed defaults filled in. */
  dates: SeasonDates;
  year: number;
  /** Sinterklaas or Christmas when one runs (also on a birthday): calendar and goals. */
  goalSeason: GoalSeasonKey | null;
  translate: Translate;
}

export const NO_SEASON: SeasonState = {
  season: null,
  hero: null,
  heroFor: () => null,
  rituals: [],
  palette: null,
  dates: {},
  year: new Date().getFullYear(),
  goalSeason: null,
  translate: translatorFor('en'),
};

export const resolveSeasonState = (
  settings: SeasonSettings,
  today: string,
  members: FamilyMember[]
): SeasonState => {
  const year = yearOf(today);
  const dates = datesForYear(settings.season_dates, year);
  const translate = translatorFor(settings.language);
  const underlying = getGoalSeason(settings, today);
  const goalSeason = (underlying?.key ?? null) as GoalSeasonKey | null;
  const season = getActiveSeason(settings, today, members);
  if (!season) return { ...NO_SEASON, dates, year, goalSeason, translate };
  // A birthday takes the hero and colours, but the journaal still airs that day
  const ritualSeasons = underlying && underlying !== season ? [season, underlying] : [season];
  const heroFor = (ctx: HeroContext) => season.hero?.(today, dates, translate, ctx) ?? null;
  return {
    season,
    hero: heroFor(EMPTY_HERO_CONTEXT),
    heroFor,
    rituals: ritualSeasons.flatMap(s => s.rituals(today, dates, translate)),
    palette: season.palette,
    dates,
    year,
    goalSeason,
    translate,
  };
};
