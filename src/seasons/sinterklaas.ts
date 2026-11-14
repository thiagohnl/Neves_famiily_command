import { FamilyMember, SinterklaasDates } from '../types';
import { TodayItem } from '../types/today';
import { HeroSpec, Season } from './types';
import { addDays, isWithin, sleepsUntil } from './dates';
import { goalChips } from './goals';
import { Translate } from './i18n';
import { memberColor } from '../constants/memberColors';

export const JOURNAAL_START = '18:00';
export const JOURNAAL_END = '18:10';
/** The "starts soon" banner shows this many minutes before the journaal. */
export const JOURNAAL_SOON_MIN = 10;
/** A calendar entry with this in its title replaces the built-in journaal row. */
export const JOURNAAL_KEYWORD = 'sinterklaasjournaal';

const ritual = (
  id: string,
  today: string,
  item: Pick<TodayItem, 'emoji' | 'title' | 'start'> & Partial<TodayItem>
): TodayItem => ({
  id: `ritual-${id}-${today}`,
  kind: 'ritual',
  memberIds: [],
  isPast: false,
  isNow: false,
  ...item,
});

/** Episode number for today (1 on journaal_start) and the season's episode count, or null outside the run. */
export const journaalEpisode = (today: string, d?: SinterklaasDates): { n: number; m: number } | null => {
  if (!d?.journaal_start || !d.pakjesavond || !isWithin(today, d.journaal_start, d.pakjesavond)) return null;
  return {
    n: sleepsUntil(d.journaal_start, today) + 1,
    m: sleepsUntil(d.journaal_start, d.pakjesavond) + 1,
  };
};

/**
 * "📺 Sinterklaasjournaal starts soon" from 17:50 until it starts, when today's list
 * has the journaal (the ritual or a calendar entry). Null otherwise.
 */
export const journaalSoonBanner = (items: TodayItem[], nowMinutes: number, t: Translate): string | null => {
  const soon = items.some(item => {
    if (item.allDay || !item.title.toLowerCase().includes(JOURNAAL_KEYWORD)) return false;
    const [h, m] = item.start.split(':').map(Number);
    const untilStart = h * 60 + m - nowMinutes;
    return untilStart > 0 && untilStart <= JOURNAAL_SOON_MIN;
  });
  return soon ? t('journaalSoon') : null;
};

/**
 * Our town's arrival in words, shared by the hero subline and the line under the
 * season calendar so the two never disagree: "3 sleeps until he visits our town",
 * "Tomorrow he sails into Haarlem", "🚢 Sinterklaas comes to Haarlem today!".
 */
export const localArrivalText = (sleeps: number, t: Translate): string => {
  if (sleeps === 0) return t('comesToHaarlemToday');
  if (sleeps === 1) return t('sailsTomorrow');
  return t('sleepsUntilLocalVisit', { n: sleeps });
};

/** The wellies chip turns gold from this time on a shoe night. */
export const WELLIES_GOLD_FROM = 16 * 60;
/** "Look in your wellies!" shows the morning after until this time. */
export const WELLIES_MORNING_UNTIL = 9 * 60;
export const WELLIES_TIME = '19:00';
export const WELLIES_POINTS = 10;
export const welliesChoreId = (childId: string, today: string) => `bonus:wellies:${childId}:${today}`;

/**
 * The next shoe night in child words, no weekday names: "🥾 Wellies tonight!",
 * "🥾 Wellies tomorrow night!", "🥾 Wellies in 3 sleeps"; null when none are left.
 * The hero chip and the line under the season calendar both use this.
 */
export const welliesText = (today: string, shoeNights: string[], t: Translate): string | null => {
  const next = [...shoeNights].sort().find(night => night >= today);
  if (!next) return null;
  const n = sleepsUntil(today, next);
  if (n === 0) return t('welliesTonight');
  if (n === 1) return t('welliesTomorrow');
  return t('welliesIn', { n });
};

/**
 * On a shoe night every child gets a 19:00 "🥾 Put your wellies out" chore with a
 * Done button: 10 points, not stored in the chores table (a `bonus:` id handled
 * by completeChore's season_bonus path, like the birthday gift chores).
 */
export const welliesChores = (
  members: FamilyMember[],
  today: string,
  d: SinterklaasDates | undefined,
  t: Translate,
  done: string[] = []
): TodayItem[] => {
  if (!(d?.shoe_nights ?? []).includes(today)) return [];
  return members
    .filter(m => !m.is_parent)
    .map(child => {
      const choreId = welliesChoreId(child.id, today);
      const isDone = done.includes(choreId);
      return {
        id: `wellies-${child.id}-${today}`,
        kind: 'chore' as const,
        emoji: '🥾',
        title: t('putShoeOut'),
        subtitle: `Chore, ${WELLIES_POINTS} points`,
        start: WELLIES_TIME,
        memberIds: [child.id],
        color: memberColor(members, child.id),
        isPast: isDone,
        isNow: false,
        ...(isDone ? {} : { completable: { choreId, points: WELLIES_POINTS, assignedTo: child.id } }),
      };
    });
};

/** Time of today's first calendar entry mentioning the intocht, if any. */
const intochtTime = (calendar: { title: string; start: string; allDay?: boolean }[]): string | null =>
  calendar
    .filter(entry => !entry.allDay && /intocht/i.test(entry.title))
    .map(entry => entry.start)
    .sort()[0] ?? null;

export const sinterklaas: Season = {
  key: 'sinterklaas',
  name: 'Sinterklaas',
  emoji: '🎁',
  isActive: (today, dates) => {
    const d = dates.sinterklaas;
    return isWithin(today, d?.journaal_start, d?.pakjesavond);
  },
  palette: {
    bg: '#F6EFE4',
    surface: '#FFFDF8',
    accent: '#9B1B2A',
    accentText: '#FFFFFF',
    button: '#9B1B2A',
    gold: '#D4A017',
  },
  // Same picture day and night for now
  illustration: (['day', 'night'] as const).map(tone => ({
    src: '/seasons/sinterklaas-ozosnel-360.webp',
    fallbackSrc: '/seasons/sinterklaas-ozosnel-360.png',
    alt: 'Sinterklaas feeding Ozosnel an apple',
    width: 446,
    height: 360,
    tone,
  })),
  hero: (today, dates, t, ctx): HeroSpec | null => {
    const d = dates.sinterklaas;
    if (!d?.pakjesavond) return null;
    const toPakjesavond = sleepsUntil(today, d.pakjesavond);
    if (toPakjesavond < 0) return null;

    // Count down to the national arrival, then to Pakjesavond
    let headline: string;
    let subline = '';
    const toIntocht = d.intocht ? sleepsUntil(today, d.intocht) : -1;
    const toLocal = d.intocht_local ? sleepsUntil(today, d.intocht_local) : -1;
    if (toLocal === 0) {
      // Our own intocht: the boat arrives in Haarlem
      headline = t('comesToHaarlemToday');
      const time = intochtTime(ctx.calendar);
      subline = time ? t('intochtAt', { time }) : t('intochtAround');
    } else if (toIntocht === 0) {
      headline = t('inNetherlands');
      if (toLocal > 0) subline = localArrivalText(toLocal, t);
    } else if (toIntocht > 0) {
      headline = t('sleepsUntilArrival', { n: toIntocht });
      if (toLocal > 0) subline = localArrivalText(toLocal, t);
    } else {
      headline = toPakjesavond > 0 ? t('sleepsUntilPakjesavond', { n: toPakjesavond }) : t('pakjesavondToday');
      if (toLocal > 0) subline = localArrivalText(toLocal, t);
      else if (isWithin(today, d.journaal_start, d.pakjesavond)) subline = t('journaalTonight');
    }

    // The morning after a shoe night, until 09:00: go and look
    const shoeNights = d.shoe_nights ?? [];
    const now = ctx.nowMinutes;
    if (now !== undefined && now < WELLIES_MORNING_UNTIL && shoeNights.includes(addDays(today, -1))) {
      subline = t('lookInWellies');
    }

    // Wellies chip: always shown on a shoe night (gold from 16:00); on other nights the
    // children's goals replace it, and it hides when no shoe nights are left
    const shoeTonight = shoeNights.includes(today);
    const wellies = welliesText(today, shoeNights, t);
    const goals = goalChips(ctx.goals, '🍫');
    const welliesChip = wellies
      ? [{ label: '', value: wellies, ...(shoeTonight && now !== undefined && now >= WELLIES_GOLD_FROM ? { gold: true } : {}) }]
      : [];
    const secondary = shoeTonight || goals.length === 0 ? welliesChip : goals;
    return {
      emoji: '🎁',
      headline,
      subline,
      chips: [
        { label: t('pakjesavond'), value: toPakjesavond === 0 ? t('tonight') : t('sleeps', { n: toPakjesavond }) },
        ...secondary,
      ],
    };
  },
  rituals: (today, dates, t) => {
    const d = dates.sinterklaas;
    const items: TodayItem[] = [];
    const episode = journaalEpisode(today, d);
    if (episode) {
      items.push(ritual('sinterklaasjournaal', today, {
        emoji: '📺',
        title: 'Sinterklaasjournaal',
        subtitle: t('journaalEpisode', episode),
        start: JOURNAAL_START,
        end: JOURNAAL_END,
        dedupeKeyword: JOURNAAL_KEYWORD,
      }));
    }
    // Shoe nights: the per-child "Put your wellies out" chores come from welliesChores()
    return items;
  },
};
