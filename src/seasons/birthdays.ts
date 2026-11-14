import { FamilyMember } from '../types';
import { TodayItem } from '../types/today';
import { memberColor } from '../constants/memberColors';
import { HeroSpec, Season } from './types';
import { addDays, isIsoDate, sleepsUntil } from './dates';
import { Translate } from './i18n';

/** Points for the generated "🎁 Make <name>'s day" chore, and the birthday member's goal bonus. */
export const BIRTHDAY_GIFT_POINTS = 50;
export const BIRTHDAY_GOAL_BONUS = 50;
/** The run-up chip shows from this many sleeps before a birthday. */
export const BIRTHDAY_CHIP_DAYS = 7;
/** The call pill that pulses during the birthday call. */
export const BIRTHDAY_CALL_CONTACT = 'Vovó';

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** The birthday's date in `year`; 29 February falls on the 28th in non-leap years. */
export const birthdayIn = (birthDate: string, year: number): string => {
  const monthDay = birthDate.slice(5);
  return monthDay === '02-29' && !isLeapYear(year) ? `${year}-02-28` : `${year}-${monthDay}`;
};

export const isBirthday = (birthDate: string | null | undefined, today: string): boolean =>
  isIsoDate(birthDate) && birthdayIn(birthDate, Number(today.slice(0, 4))) === today;

/** The next birthday on or after today (this year's, or next year's once it has passed). */
export const nextBirthday = (birthDate: string, today: string): string => {
  const year = Number(today.slice(0, 4));
  const thisYear = birthdayIn(birthDate, year);
  return thisYear >= today ? thisYear : birthdayIn(birthDate, year + 1);
};

/** Completed years on `today`. */
export const ageOn = (birthDate: string, today: string): number => {
  const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return today >= birthdayIn(birthDate, Number(today.slice(0, 4))) ? years : years - 1;
};

/** How the board names someone in child words: parents are Papa or Mama, children by name. */
export const displayName = (member: FamilyMember, t: Translate): string => {
  if (member.is_parent && member.gender === 'male') return t('papa');
  if (member.is_parent && member.gender === 'female') return t('mama');
  return member.name;
};

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;

export const celebrantsOn = (members: FamilyMember[], day: string): FamilyMember[] =>
  members.filter(m => isBirthday(m.birth_date, day));

// --- Gift chores and bonuses: ids recorded in season_dates[year].bonuses.done ---

export const SEASON_BONUS_PREFIX = 'bonus:';
/** Generated chores (not in the chores table) carry a choreId with this prefix. */
export const isSeasonBonusId = (choreId: string) => choreId.startsWith(SEASON_BONUS_PREFIX);
export const giftChoreId = (celebrantId: string, childId: string, today: string) =>
  `${SEASON_BONUS_PREFIX}birthday:${celebrantId}:${childId}:${today}`;
export const goalBonusKey = (memberId: string, today: string) => `goal:${memberId}:${today}`;

// --- Run-up chip ---

/** The nearest family birthday within 0..7 sleeps, or null. */
export const upcomingBirthday = (
  members: FamilyMember[],
  today: string
): { member: FamilyMember; sleeps: number } | null => {
  const upcoming = members
    .filter(m => isIsoDate(m.birth_date))
    .map(member => ({ member, sleeps: sleepsUntil(today, nextBirthday(member.birth_date!, today)) }))
    .filter(u => u.sleeps <= BIRTHDAY_CHIP_DAYS)
    .sort((a, b) => a.sleeps - b.sleeps);
  return upcoming[0] ?? null;
};

/** "🎂 3 sleeps until Isabel's birthday" (singular at 1, "today" at 0). */
export const birthdayCountdownText = (name: string, sleeps: number, t: Translate): string =>
  sleeps === 0 ? t('birthdayToday', { name }) : t('birthdaySleeps', { n: sleeps, name });

/** The chip another season's hero gains in the 7 days before a birthday (label empty: one line). */
export const birthdayRunUpChip = (members: FamilyMember[], today: string, t: Translate): HeroSpec['chips'][number] | null => {
  const next = upcomingBirthday(members, today);
  if (!next || next.sleeps < 1) return null;
  return { label: '', value: birthdayCountdownText(displayName(next.member, t), next.sleeps, t) };
};

// --- The day itself ---

/** Mix a #RRGGBB colour towards white; amount 0 keeps it, 1 is white. */
export const tint = (hex: string, amount: number): string => {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return '#' + channels
    .map(c => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

const AGE_MARK = '\u0000';

/**
 * Builds a one-day season for whoever has a birthday today, or null.
 * Members are a runtime list, so this is a factory rather than a fixed season.
 */
export const birthdaySeason = (members: FamilyMember[], today: string): Season | null => {
  const celebrating = celebrantsOn(members, today);
  if (celebrating.length === 0) return null;

  const star = celebrating[0];
  const accent = memberColor(members, star.id);

  return {
    key: 'birthday',
    name: 'Birthday',
    emoji: '🎂',
    isActive: (day) => celebrating.some(m => isBirthday(m.birth_date, day)),
    palette: {
      bg: '#FFF8EC', // cream, with the confetti dots from index.css
      surface: '#FFFFFF',
      accent,
      accentText: '#FFFFFF',
      button: accent,
      gold: tint(accent, 0.45),
      pattern: 'confetti',
    },
    hero: (_today, _dates, t) => {
      const name = displayName(star, t);
      const photo = { memberId: star.id, url: star.photo_url, avatar: star.avatar, color: accent, name: star.name };
      if (celebrating.length === 1 && star.show_age !== false) {
        const age = ageOn(star.birth_date!, today);
        const [before, after] = t('birthdayAge', { name, age: AGE_MARK }).split(AGE_MARK);
        return {
          emoji: '🎂',
          headline: t('birthdayAge', { name, age }),
          headlineBig: { before, big: String(age), after: after ?? '' },
          subline: '',
          chips: [],
          photo,
        };
      }
      return {
        emoji: '🎂',
        headline: t('happyBirthday', { name: joinNames(celebrating.map(m => displayName(m, t))) }),
        subline: '',
        chips: [],
        photo,
      };
    },
    rituals: () => [],
  };
};

const birthdayItem = (id: string, today: string, item: Omit<TodayItem, 'id' | 'kind' | 'isPast' | 'isNow'> & Partial<TodayItem>): TodayItem => ({
  id: `birthday-${id}-${today}`,
  kind: 'ritual',
  isPast: false,
  isNow: false,
  ...item,
});

export interface BirthdayDay {
  /** Day-off rows, traktatie, cake time, the Vovó call and the gift chores (plus the eve reminder). */
  items: TodayItem[];
  /** Children whose own chores are hidden today. */
  choresOffFor: string[];
  /** Everyone celebrating today. */
  celebrantIds: string[];
}

/**
 * What a birthday adds to today's list. Children get a day off (their chores are
 * replaced by one row) and a traktatie; everyone gets cake time and a call to
 * Vovó; every other child gets a 50 point "Make <name>'s day" chore. The evening
 * before a child's birthday, parents get a reminder to prepare the traktatie.
 * `done` holds completed generated chore ids (season_dates[year].bonuses.done).
 */
export const birthdayDay = (members: FamilyMember[], today: string, t: Translate, done: string[] = []): BirthdayDay => {
  const items: TodayItem[] = [];
  const parents = members.filter(m => m.is_parent).map(m => m.id);
  const celebrating = celebrantsOn(members, today);
  const childCelebrants = celebrating.filter(m => !m.is_parent);

  const tomorrowsChildren = celebrantsOn(members, addDays(today, 1)).filter(m => !m.is_parent);
  if (tomorrowsChildren.length > 0) {
    items.push(birthdayItem('traktatie-prep', today, {
      emoji: '🧁',
      title: t('prepareTraktatie'),
      subtitle: joinNames(tomorrowsChildren.map(m => m.name)),
      start: '20:00',
      memberIds: parents,
    }));
  }

  childCelebrants.forEach(child => {
    items.push(birthdayItem(`day-off-${child.id}`, today, {
      emoji: '🎉',
      title: t('dayOff', { name: displayName(child, t) }),
      start: '00:00',
      allDay: true,
      memberIds: [child.id],
      color: memberColor(members, child.id),
    }));
    items.push(birthdayItem(`traktatie-${child.id}`, today, {
      emoji: '🧁',
      title: t('traktatieSchool'),
      start: '08:00',
      memberIds: [child.id],
    }));
  });

  if (celebrating.length > 0) {
    const ids = celebrating.map(m => m.id);
    items.push(birthdayItem('cake', today, { emoji: '🎂', title: t('cakeTime'), start: '16:00', memberIds: [] }));
    items.push(birthdayItem('call', today, {
      emoji: '📞',
      title: t('callVovo'),
      start: '17:30',
      end: '18:00',
      memberIds: ids,
      pulseContact: BIRTHDAY_CALL_CONTACT,
    }));

    // Gift chores: every other child makes the birthday person's day
    celebrating.forEach(star => {
      members
        .filter(m => !m.is_parent && !ids.includes(m.id))
        .forEach(child => {
          const choreId = giftChoreId(star.id, child.id, today);
          const isDone = done.includes(choreId);
          items.push({
            id: `birthday-gift-${star.id}-${child.id}-${today}`,
            kind: 'chore',
            emoji: '🎁',
            title: t('makeDay', { name: displayName(star, t) }),
            subtitle: `Chore, ${BIRTHDAY_GIFT_POINTS} points`,
            start: '07:00',
            memberIds: [child.id],
            color: memberColor(members, child.id),
            isPast: isDone,
            isNow: false,
            ...(isDone ? {} : { completable: { choreId, points: BIRTHDAY_GIFT_POINTS, assignedTo: child.id } }),
          });
        });
    });
  }

  return { items, choresOffFor: childCelebrants.map(m => m.id), celebrantIds: celebrating.map(m => m.id) };
};
