// The season calendar under the clock: one cell per day of the run-up, each with
// an emoji, crossed off as the days go by. Pure functions; the component renders.
import { GoalSeasonKey, SeasonDates } from '../types';
import { eachDay, sleepsUntil } from './dates';
import { SeasonStringKey, Translate } from './i18n';
import { welliesText } from './sinterklaas';
import { birthdayCountdownText } from './birthdays';

export type CalendarDayKind = 'arrival' | 'shoe' | 'final' | 'journaal' | 'trip' | 'advent' | 'birthday';

export interface CalendarDay {
  emoji: string;
  /** Spoken label (aria); cells show no text. */
  label: string;
  kind: CalendarDayKind;
  /** Shoe nights and the final day get a faint gold background. */
  gold?: boolean;
  /** Birthday cells: who (for the caption). */
  name?: string;
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

/** A family birthday to mark 🎂 on the grid. */
export interface CalendarBirthday {
  date: string;
  name: string;
}

/** Puts 🎂 on birthdays inside the grid; a gold day keeps its gold. */
const markBirthdays = (spec: SeasonCalendarSpec, birthdays: CalendarBirthday[], t: Translate): SeasonCalendarSpec => {
  birthdays.forEach(({ date, name }) => {
    const day = spec.days[date];
    if (day) spec.days[date] = { emoji: '🎂', label: t('calBirthday', { name }), kind: 'birthday', gold: day.gold, name };
  });
  return spec;
};

/**
 * Sinterklaas: from the national intocht to Pakjesavond (22 cells in 2026), so today is on the
 * grid from day one. When a day means several things the first wins:
 * birthday 🎂 > Pakjesavond 🎁 > shoe night 🥾 > intocht 🚢 (national and Haarlem) > 📺 (weekends included).
 * Christmas: 1 to 25 December (🎄 on the 25th, ✈️ on London/Eurostar all-day events, 🎅 otherwise).
 */
export const seasonCalendar = (
  seasonKey: GoalSeasonKey,
  dates: SeasonDates,
  year: number,
  t: Translate,
  allDay: AllDayEntry[] = [],
  birthdays: CalendarBirthday[] = []
): SeasonCalendarSpec | null => {
  const days: Record<string, CalendarDay> = {};

  if (seasonKey === 'sinterklaas') {
    const d = dates.sinterklaas;
    const start = d?.intocht ?? d?.intocht_local;
    if (!start || !d?.pakjesavond || start > d.pakjesavond) return null;
    const shoeNights = new Set(d.shoe_nights ?? []);
    eachDay(start, d.pakjesavond).forEach(day => {
      if (day === d.pakjesavond) days[day] = { emoji: '🎁', label: t('calPakjesavond'), kind: 'final', gold: true };
      else if (shoeNights.has(day)) days[day] = { emoji: '🥾', label: t('calShoe'), kind: 'shoe', gold: true };
      else if (day === d.intocht) days[day] = { emoji: '🚢', label: t('calArrival'), kind: 'arrival' };
      else if (day === d.intocht_local) days[day] = { emoji: '🚢', label: t('calHaarlem'), kind: 'arrival' };
      else days[day] = { emoji: '📺', label: t('calJournaal'), kind: 'journaal' };
    });
    return markBirthdays({ seasonKey, start, end: d.pakjesavond, days }, birthdays, t);
  }

  const start = `${year}-12-01`;
  const end = `${year}-12-25`;
  const tripDays = new Set(allDay.filter(e => TRIP_TITLE.test(e.title)).map(e => e.date));
  eachDay(start, end).forEach(day => {
    if (day === end) days[day] = { emoji: '🎄', label: t('calChristmas'), kind: 'final', gold: true };
    else if (tripDays.has(day)) days[day] = { emoji: '✈️', label: t('calTrip'), kind: 'trip' };
    else days[day] = { emoji: '🎅', label: t('calAdvent'), kind: 'advent' };
  });
  return markBirthdays({ seasonKey, start, end, days }, birthdays, t);
};

/** Only days inside the calendar, and only today or earlier, can be crossed off. */
export const canCrossDay = (spec: SeasonCalendarSpec, day: string, today: string): boolean =>
  day in spec.days && day <= today;

/** Days before today that aren't crossed yet: they cross themselves at midnight. */
export const missingCrossedDays = (spec: SeasonCalendarSpec, crossed: string[], today: string): string[] => {
  const done = new Set(crossed);
  return Object.keys(spec.days).filter(day => day < today && !done.has(day)).sort();
};

type Phrase = { today: SeasonStringKey; tomorrow?: SeasonStringKey; later: SeasonStringKey };
type Speak = (day: string, today: string, t: Translate, info: CalendarDay) => string;

// Wellies and birthdays reuse the hero's own wording (welliesText,
// birthdayCountdownText), so the caption and the hero never say different things
const SPOKEN: Partial<Record<CalendarDayKind, Speak>> = {
  shoe: (day, today, t) => welliesText(today, [day], t)!,
  birthday: (day, today, t, info) => birthdayCountdownText(info.name ?? '', sleepsUntil(today, day), t),
};

/** Cells that matter to a child: the next one of these bounces. */
const BOUNCE_KINDS: CalendarDayKind[] = ['shoe', 'birthday', 'final'];

/** The next special cell after today (🥾, 🎂, or 🎁/🎄 if that is nearer): the only cell that bounces. */
export const bounceDay = (spec: SeasonCalendarSpec, today: string): string | null =>
  Object.keys(spec.days).sort().find(day => day > today && BOUNCE_KINDS.includes(spec.days[day].kind)) ?? null;

const PHRASES: Record<GoalSeasonKey, Partial<Record<CalendarDayKind, Phrase>>> = {
  sinterklaas: {
    final: { today: 'nextPakjesavondToday', later: 'nextPakjesavondIn' },
  },
  christmas: {
    trip: { today: 'nextTripToday', tomorrow: 'nextTripTomorrow', later: 'nextTripIn' },
    final: { today: 'nextChristmasToday', later: 'nextChristmasIn' },
  },
};

/** The next special day in child words, no weekday names: "🥾 Wellies tomorrow night!", "🎁 4 more sleeps"... */
export const nextSpecialLine = (spec: SeasonCalendarSpec, today: string, t: Translate): string | null => {
  const phrases = PHRASES[spec.seasonKey];
  const spoken = SPOKEN;
  const next = Object.keys(spec.days)
    .sort()
    .find(day => day >= today && (phrases[spec.days[day].kind] || spoken[spec.days[day].kind]));
  if (!next) return null;
  const n = sleepsUntil(today, next);
  const speak = spoken[spec.days[next].kind];
  if (speak) return speak(next, today, t, spec.days[next]);
  const phrase = phrases[spec.days[next].kind]!;
  if (n === 0) return t(phrase.today);
  if (n === 1 && phrase.tomorrow) return t(phrase.tomorrow);
  return t(phrase.later, { n });
};
