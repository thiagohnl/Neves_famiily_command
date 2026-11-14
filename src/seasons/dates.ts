// Calendar-day maths on YYYY-MM-DD strings. Going through UTC keeps a DST
// change (a 23 or 25 hour day) from adding or losing a sleep.
import { SinterklaasDates } from '../types';

const dayNumber = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

const fromDayNumber = (n: number): string => new Date(n * 86_400_000).toISOString().slice(0, 10);

/** Nights between today and target: 0 on the day itself, negative once it has passed. */
export const sleepsUntil = (today: string, target: string): number =>
  dayNumber(target) - dayNumber(today);

/** Inclusive date range check; a missing bound means the range is not set. */
export const isWithin = (today: string, from?: string, to?: string): boolean =>
  !!from && !!to && today >= from && today <= to;

export const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const addDays = (iso: string, days: number): string => fromDayNumber(dayNumber(iso) + days);

/** 1 = Monday ... 7 = Sunday. */
export const isoWeekday = (iso: string): number => {
  const day = new Date(dayNumber(iso) * 86_400_000).getUTCDay();
  return day === 0 ? 7 : day;
};

/** Every date from `from` to `to` inclusive (empty when `to` is before `from`). */
export const eachDay = (from: string, to: string): string[] => {
  const days: string[] = [];
  for (let n = dayNumber(from); n <= dayNumber(to); n++) days.push(fromDayNumber(n));
  return days;
};

/**
 * The usual Sinterklaas calendar for a year:
 * - intocht: the first Saturday strictly after 11 November
 * - intocht_local: the Sunday after it (Haarlem)
 * - journaal_start: the Monday before the intocht
 * - pakjesavond: 5 December
 * - shoe_nights: none; parents choose them
 */
export const defaultSinterklaasDates = (year: number): SinterklaasDates => {
  const eleventh = `${year}-11-11`;
  const toSaturday = (6 - isoWeekday(eleventh) + 7) % 7 || 7;
  const intocht = addDays(eleventh, toSaturday);
  return {
    intocht,
    intocht_local: addDays(intocht, 1),
    journaal_start: addDays(intocht, -5),
    pakjesavond: `${year}-12-05`,
    shoe_nights: [],
  };
};
