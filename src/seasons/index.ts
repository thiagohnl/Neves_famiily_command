import { AppSettings, FamilyMember, GoalSeasonKey, SeasonDates } from '../types';
import { TodayItem } from '../types/today';
import { EMPTY_HERO_CONTEXT, HeroContext, HeroSpec, Season, SeasonPalette } from './types';
import { sinterklaas } from './sinterklaas';
import { christmas } from './christmas';
import { birthdayDay, birthdayRunUpChip, birthdaySeason } from './birthdays';
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
 * 'none' forces no season. Otherwise a family birthday wins for that day, even over
 * a forced season; then the forced season, else Sinterklaas, then Christmas by date.
 * Sinterklaas dates are computed for the year unless a parent set them.
 */
export const getActiveSeason = (
  settings: Pick<SeasonSettings, 'active_season' | 'season_dates'>,
  today: string,
  members: FamilyMember[]
): Season | null => {
  const override = settings.active_season;
  if (override === 'none') return null;
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
  /** Members celebrating a birthday today. */
  birthdayIds: string[];
  /** Children on their birthday: their own chores are hidden behind a day-off row. */
  choresOffFor: string[];
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
  birthdayIds: [],
  choresOffFor: [],
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
  if (settings.active_season === 'none') return { ...NO_SEASON, dates, year, goalSeason, translate };

  // Birthday rows come on top of whatever season runs (the eve reminder needs no season at all)
  const birthday = birthdayDay(members, today, translate, dates.birthdays?.done);
  const birthdayState = { birthdayIds: birthday.celebrantIds, choresOffFor: birthday.choresOffFor };
  if (!season) return { ...NO_SEASON, dates, year, goalSeason, translate, rituals: birthday.items, ...birthdayState };

  // A birthday takes the hero and colours, but the journaal still airs that day
  const ritualSeasons = underlying && underlying !== season ? [season, underlying] : [season];
  // In the week before a birthday the running season's hero gains a countdown chip
  const runUpChip = season.key === 'birthday' ? null : birthdayRunUpChip(members, today, translate);
  const heroFor = (ctx: HeroContext) => {
    const hero = season.hero?.(today, dates, translate, ctx) ?? null;
    return hero && runUpChip ? { ...hero, chips: [...hero.chips, runUpChip] } : hero;
  };
  return {
    season,
    hero: heroFor(EMPTY_HERO_CONTEXT),
    heroFor,
    rituals: [...ritualSeasons.flatMap(s => s.rituals(today, dates, translate)), ...birthday.items],
    palette: season.palette,
    dates,
    year,
    goalSeason,
    translate,
    ...birthdayState,
  };
};
