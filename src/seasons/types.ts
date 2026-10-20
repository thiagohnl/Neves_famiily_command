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
}

export interface HeroSpec {
  emoji: string;
  headline: string;
  subline: string;
  chips: { label: string; value: string }[];
}

export interface Season {
  key: string;
  name: string;
  emoji: string;
  /** `today` is YYYY-MM-DD. */
  isActive: (today: string, dates: SeasonDates) => boolean;
  palette: SeasonPalette;
  hero?: (today: string, dates: SeasonDates, t: Translate) => HeroSpec | null;
  rituals: (today: string, dates: SeasonDates, t: Translate) => TodayItem[];
  clockEmoji?: Partial<Record<Whereabout, string>>;
}
