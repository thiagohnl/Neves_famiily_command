import { FamilyMember } from '../types';
import { memberColor } from '../constants/memberColors';
import { Season } from './types';
import { isIsoDate } from './dates';

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** A 29 February birthday is celebrated on the 28th in non-leap years. */
export const isBirthday = (birthDate: string | null | undefined, today: string): boolean => {
  if (!isIsoDate(birthDate)) return false;
  const monthDay = birthDate.slice(5);
  const todayMonthDay = today.slice(5);
  if (monthDay === '02-29' && !isLeapYear(Number(today.slice(0, 4)))) return todayMonthDay === '02-28';
  return monthDay === todayMonthDay;
};

/** Mix a #RRGGBB colour towards white; amount 0 keeps it, 1 is white. */
const tint = (hex: string, amount: number): string => {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return '#' + channels
    .map(c => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;

/**
 * Builds a one-day season for whoever has a birthday today, or null.
 * Members are a runtime list, so this is a factory rather than a fixed season.
 */
export const birthdaySeason = (members: FamilyMember[], today: string): Season | null => {
  const celebrating = members.filter(m => isBirthday(m.birth_date, today));
  if (celebrating.length === 0) return null;

  const accent = memberColor(members, celebrating[0].id);
  const names = celebrating.map(m => m.name);
  const year = Number(today.slice(0, 4));

  return {
    key: 'birthday',
    name: 'Birthday',
    emoji: '🎂',
    isActive: (day) => celebrating.some(m => isBirthday(m.birth_date, day)),
    palette: {
      bg: tint(accent, 0.88),
      surface: '#FFFFFF',
      accent,
      accentText: '#FFFFFF',
      button: accent,
      gold: '#F59E0B',
    },
    hero: (_today, _dates, t) => ({
      emoji: '🎂',
      headline: t('happyBirthday', { name: joinNames(names) }),
      // Age only reads naturally for a single birthday
      subline: celebrating.length === 1
        ? t('turnsAge', { name: names[0], age: year - Number(celebrating[0].birth_date!.slice(0, 4)) })
        : '',
      chips: [],
    }),
    rituals: () => [],
  };
};
