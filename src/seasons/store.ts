// app_settings.season_dates is keyed by year: {"2026": {"sinterklaas": {...}}}.
// These helpers read it (with computed defaults filled in) and write changes back.
import { GoalSeasonKey, SeasonDates, SeasonDatesByYear, SinterklaasDates } from '../types';
import { defaultSinterklaasDates, isIsoDate } from './dates';

const YEAR_KEY = /^\d{4}$/;

/** Year the flat (pre-2026-11) shape belonged to: its Pakjesavond's year, else 2026. */
const legacyYear = (flat: SeasonDates): string => {
  const pakjesavond = flat.sinterklaas?.pakjesavond;
  return isIsoDate(pakjesavond) ? pakjesavond.slice(0, 4) : '2026';
};

/**
 * Accepts both the per-year shape and the old flat one ({"sinterklaas": {...}}),
 * which is moved under its year. The migration does the same in the database;
 * this keeps the board right if it runs before the migration does.
 */
export const normalizeSeasonDates = (raw: unknown): SeasonDatesByYear => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const byYear: SeasonDatesByYear = {};
  const flat: SeasonDates = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    if (YEAR_KEY.test(key)) byYear[key] = { ...(byYear[key] ?? {}), ...(value as SeasonDates) };
    else (flat as Record<string, unknown>)[key] = value;
  });
  if (Object.keys(flat).length > 0) {
    const year = legacyYear(flat);
    byYear[year] = { ...flat, ...(byYear[year] ?? {}) };
  }
  return byYear;
};

/** Stored Sinterklaas values win over the computed ones; empty strings count as unset. */
const mergeSinterklaas = (year: number, stored: SinterklaasDates | undefined): SinterklaasDates => {
  const merged: SinterklaasDates = { ...defaultSinterklaasDates(year) };
  Object.entries(stored ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    (merged as Record<string, unknown>)[key] = value;
  });
  return merged;
};

/** One year's dates as the season engine uses them: computed defaults plus whatever a parent set. */
export const datesForYear = (raw: unknown, year: number): SeasonDates => {
  const stored = normalizeSeasonDates(raw)[String(year)] ?? {};
  return { ...stored, sinterklaas: mergeSinterklaas(year, stored.sinterklaas) };
};

/** Replace one season's stored values for a year, keeping every other year and season. */
export const withSeasonEntry = <K extends keyof SeasonDates>(
  raw: unknown,
  year: number,
  season: K,
  value: SeasonDates[K]
): SeasonDatesByYear => {
  const byYear = normalizeSeasonDates(raw);
  const key = String(year);
  return { ...byYear, [key]: { ...(byYear[key] ?? {}), [season]: value } };
};

export const crossedDays = (raw: unknown, year: number, season: GoalSeasonKey): string[] =>
  normalizeSeasonDates(raw)[String(year)]?.[season]?.crossed_days ?? [];

/** Add (or with `crossed` false, remove) days in a season's crossed_days list. */
export const withCrossedDays = (
  raw: unknown,
  year: number,
  season: GoalSeasonKey,
  days: string[],
  crossed = true
): SeasonDatesByYear => {
  const byYear = normalizeSeasonDates(raw);
  const current = byYear[String(year)]?.[season] ?? {};
  const set = new Set(current.crossed_days ?? []);
  days.forEach(day => (crossed ? set.add(day) : set.delete(day)));
  return withSeasonEntry(byYear, year, season, { ...current, crossed_days: [...set].sort() });
};
