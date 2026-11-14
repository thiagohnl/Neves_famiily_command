// The season calendar under the clock: one cell per day of the run-up, each with
// an emoji, crossed off as the days go by. Pure functions; the component renders.
import { GoalSeasonKey, SeasonDates } from '../types';
import { eachDay, sleepsUntil } from './dates';
import { SeasonStringKey, Translate } from './i18n';

export type CalendarDayKind = 'arrival' | 'shoe' | 'final' | 'journaal' | 'trip' | 'advent';

export interface CalendarDay {
  emoji: string;
  /** Spoken label (aria); cells show no text. */
  label: string;
  kind: CalendarDayKind;
  /** Shoe nights and the final day get a faint gold background. */
  gold?: boolean;
}

export interface SeasonCalendarSpec {
  seasonKey: GoalSeasonKey;
  start: string;
  end: string;
  days: Record<string, CalendarDay>;
}

/** An all-day Google Calendar entry on a date (multi-day events arrive once per day). */
export interface AllDayEntry {
  date: string;
  title: string;
}

const TRIP_TITLE = /london|eurostar/i;

/**
 * Sinterklaas: from our town's intocht to Pakjesavond (🚢, 👟 on shoe nights, 🎁, 📺 otherwise).
 * Christmas: 1 to 25 December (🎄 on the 25th, ✈️ on London/Eurostar all-day events, 🎅 otherwise).
 */
export const seasonCalendar = (
  seasonKey: GoalSeasonKey,
  dates: SeasonDates,
  year: number,
  t: Translate,
  allDay: AllDayEntry[] = []
): SeasonCalendarSpec | null => {
  const days: Record<string, CalendarDay> = {};

  if (seasonKey === 'sinterklaas') {
    const d = dates.sinterklaas;
    if (!d?.intocht_local || !d.pakjesavond || d.intocht_local > d.pakjesavond) return null;
    const shoeNights = new Set(d.shoe_nights ?? []);
    eachDay(d.intocht_local, d.pakjesavond).forEach(day => {
      if (day === d.pakjesavond) days[day] = { emoji: '🎁', label: t('calPakjesavond'), kind: 'final', gold: true };
      else if (day === d.intocht_local) days[day] = { emoji: '🚢', label: t('calArrival'), kind: 'arrival' };
      else if (shoeNights.has(day)) days[day] = { emoji: '👟', label: t('calShoe'), kind: 'shoe', gold: true };
      else days[day] = { emoji: '📺', label: t('calJournaal'), kind: 'journaal' };
    });
    return { seasonKey, start: d.intocht_local, end: d.pakjesavond, days };
  }

  const start = `${year}-12-01`;
  const end = `${year}-12-25`;
  const tripDays = new Set(allDay.filter(e => TRIP_TITLE.test(e.title)).map(e => e.date));
  eachDay(start, end).forEach(day => {
    if (day === end) days[day] = { emoji: '🎄', label: t('calChristmas'), kind: 'final', gold: true };
    else if (tripDays.has(day)) days[day] = { emoji: '✈️', label: t('calTrip'), kind: 'trip' };
    else days[day] = { emoji: '🎅', label: t('calAdvent'), kind: 'advent' };
  });
  return { seasonKey, start, end, days };
};

/** Only days inside the calendar, and only today or earlier, can be crossed off. */
export const canCrossDay = (spec: SeasonCalendarSpec, day: string, today: string): boolean =>
  day in spec.days && day <= today;

/** Days before today that aren't crossed yet: they cross themselves at midnight. */
export const missingCrossedDays = (spec: SeasonCalendarSpec, crossed: string[], today: string): string[] => {
  const done = new Set(crossed);
  return Object.keys(spec.days).filter(day => day < today && !done.has(day)).sort();
};

/** Monday-first grid: blank cells before the first day so each column is one weekday. */
export const leadingBlanks = (start: string): number => {
  const day = new Date(`${start}T12:00:00Z`).getUTCDay();
  return day === 0 ? 6 : day - 1;
};

type Phrase = { today: SeasonStringKey; tomorrow?: SeasonStringKey; later: SeasonStringKey };

const PHRASES: Record<GoalSeasonKey, Partial<Record<CalendarDayKind, Phrase>>> = {
  sinterklaas: {
    arrival: { today: 'nextArrivalToday', tomorrow: 'nextArrivalTomorrow', later: 'nextArrivalIn' },
    shoe: { today: 'nextShoeTonight', tomorrow: 'nextShoeTomorrow', later: 'nextShoeIn' },
    final: { today: 'nextPakjesavondToday', later: 'nextPakjesavondIn' },
  },
  christmas: {
    trip: { today: 'nextTripToday', tomorrow: 'nextTripTomorrow', later: 'nextTripIn' },
    final: { today: 'nextChristmasToday', later: 'nextChristmasIn' },
  },
};

/** The next special day in child words: "👟 Shoe night: tomorrow", "🎁 4 more sleeps"... */
export const nextSpecialLine = (spec: SeasonCalendarSpec, today: string, t: Translate): string | null => {
  const phrases = PHRASES[spec.seasonKey];
  const next = Object.keys(spec.days)
    .sort()
    .find(day => day >= today && phrases[spec.days[day].kind]);
  if (!next) return null;
  const phrase = phrases[spec.days[next].kind]!;
  const n = sleepsUntil(today, next);
  if (n === 0) return t(phrase.today);
  if (n === 1 && phrase.tomorrow) return t(phrase.tomorrow);
  return t(phrase.later, { n });
};
