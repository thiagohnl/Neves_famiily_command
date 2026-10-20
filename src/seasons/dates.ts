// Calendar-day maths on YYYY-MM-DD strings. Going through UTC keeps a DST
// change (a 23 or 25 hour day) from adding or losing a sleep.

const dayNumber = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Nights between today and target: 0 on the day itself, negative once it has passed. */
export const sleepsUntil = (today: string, target: string): number =>
  dayNumber(target) - dayNumber(today);

/** Inclusive date range check; a missing bound means the range is not set. */
export const isWithin = (today: string, from?: string, to?: string): boolean =>
  !!from && !!to && today >= from && today <= to;

export const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
