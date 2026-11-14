import { SeasonDates } from '../types';
import { TodayItem } from '../types/today';
import { Whereabout } from '../constants/whereabouts';
import { Translate } from './i18n';

export interface SeasonPalette {
  bg: string;
  surface: string;
  accent: string;
  accentText: string;
  button: string;
  gold: string;
  /** Static background decoration while the season runs (birthday confetti dots). */
  pattern?: 'confetti';
}

export interface HeroSpec {
  emoji: string;
  headline: string;
  subline: string;
  /** A chip with an empty label shows only its value (e.g. the birthday countdown). */
  chips: { label: string; value: string }[];
  /** Headline split around one part shown very large (the age on a birthday). */
  headlineBig?: { before: string; big: string; after: string };
  /** Large photo in place of the emoji (the birthday member). */
  photo?: { memberId: string; url?: string; avatar: string; color: string; name: string };
}

/** What the board knows beyond the dates: today's calendar and the children's points goals. */
export interface HeroContext {
  /** Today's schedule and Google Calendar entries (start is HH:mm). */
  calendar: { title: string; start: string; allDay?: boolean }[];
  /** This season's points goals, one per child with a target. */
  goals: { name: string; earned: number; target: number }[];
}

export const EMPTY_HERO_CONTEXT: HeroContext = { calendar: [], goals: [] };

export interface Season {
  key: string;
  name: string;
  emoji: string;
  /** `today` is YYYY-MM-DD. */
  isActive: (today: string, dates: SeasonDates) => boolean;
  palette: SeasonPalette;
  hero?: (today: string, dates: SeasonDates, t: Translate, ctx: HeroContext) => HeroSpec | null;
  rituals: (today: string, dates: SeasonDates, t: Translate) => TodayItem[];
  clockEmoji?: Partial<Record<Whereabout, string>>;
}
