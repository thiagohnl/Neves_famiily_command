// The season calendar under the clock: one cell per day of the run-up, each with
// an emoji, crossed off as the days go by. Pure functions; the component renders.
import { GoalSeasonKey, SeasonDates } from '../types';
import { eachDay, isoWeekday, sleepsUntil } from './dates';
import { SeasonStringKey, Translate } from './i18n';
import { localArrivalText, welliesText } from './sinterklaas';

export type CalendarDayKind = 'arrival' | 'shoe' | 'final' | 'journaal' | 'weekend' | 'trip' | 'advent' | 'birthday';

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

/** A family birthday to mark 🎂 on the grid. */
export interface CalendarBirthday {
  date: string;
  name: string;
}

/** Puts 🎂 on birthdays inside the grid; a gold day keeps its gold. */
const markBirthdays = (spec: SeasonCalendarSpec, birthdays: CalendarBirthday[], t: Translate): SeasonCalendarSpec => {
  birthdays.forEach(({ date, name }) => {
    const day = spec.days[date];
    if (day) spec.days[date] = { emoji: '🎂', label: t('calBirthday', { name }), kind: 'birthday', gold: day.gold };
  });
  return spec;
};

/**
 * Sinterklaas: from our town's intocht to Pakjesavond. When a day means several things the first wins:
 * birthday 🎂 > Pakjesavond 🎁 > shoe night 🥾 > intocht 🚢 > weekend 🍪 > weekday 📺.
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
    if (!d?.intocht_local || !d.pakjesavond || d.intocht_local > d.pakjesavond) return null;
    const shoeNights = new Set(d.shoe_nights ?? []);
    eachDay(d.intocht_local, d.pakjesavond).forEach(day => {
      if (day === d.pakjesavond) days[day] = { emoji: '🎁', label: t('calPakjesavond'), kind: 'final', gold: true };
      else if (shoeNights.has(day)) days[day] = { emoji: '🥾', label: t('calShoe'), kind: 'shoe', gold: true };
      else if (day === d.intocht_local) days[day] = { emoji: '🚢', label: t('calArrival'), kind: 'arrival' };
      else if (isoWeekday(day) >= 6) days[day] = { emoji: '🍪', label: t('calWeekend'), kind: 'weekend' };
      else days[day] = { emoji: '📺', label: t('calJournaal'), kind: 'journaal' };
    });
    return markBirthdays({ seasonKey, start: d.intocht_local, end: d.pakjesavond, days }, birthdays, t);
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
type Speak = (day: string, today: string, t: Translate) => string;

// The arrival and wellies lines reuse the hero's own wording (localArrivalText,
// welliesText), so the grid line and the hero never say different things
const SPOKEN: Partial<Record<CalendarDayKind, Speak>> = {
  arrival: (day, today, t) => {
    const n = sleepsUntil(today, day);
    return n === 0 ? localArrivalText(0, t) : `🚢 ${localArrivalText(n, t)}`;
  },
  shoe: (day, today, t) => welliesText(today, [day], t)!,
};

const PHRASES: Record<GoalSeasonKey, Partial<Record<CalendarDayKind, Phrase>>> = {
  sinterklaas: {
    final: { today: 'nextPakjesavondToday', later: 'nextPakjesavondIn' },
  },
  christmas: {
    trip: { today: 'nextTripToday', tomorrow: 'nextTripTomorrow', later: 'nextTripIn' },
    final: { today: 'nextChristmasToday', later: 'nextChristmasIn' },
  },
};

/** The next special day in child words: "🥾 Next wellies: Friday", "🎁 4 more sleeps"... */
export const nextSpecialLine = (spec: SeasonCalendarSpec, today: string, t: Translate): string | null => {
  const phrases = PHRASES[spec.seasonKey];
  const spoken = spec.seasonKey === 'sinterklaas' ? SPOKEN : {};
  const next = Object.keys(spec.days)
    .sort()
    .find(day => day >= today && (phrases[spec.days[day].kind] || spoken[spec.days[day].kind]));
  if (!next) return null;
  const n = sleepsUntil(today, next);
  const speak = spoken[spec.days[next].kind];
  if (speak) return speak(next, today, t);
  const phrase = phrases[spec.days[next].kind]!;
  if (n === 0) return t(phrase.today);
  if (n === 1 && phrase.tomorrow) return t(phrase.tomorrow);
  return t(phrase.later, { n });
};
