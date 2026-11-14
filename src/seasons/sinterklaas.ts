import { SinterklaasDates } from '../types';
import { TodayItem } from '../types/today';
import { HeroSpec, Season } from './types';
import { isWithin, sleepsUntil } from './dates';
import { goalChips } from './goals';
import { Translate } from './i18n';

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
  hero: (today, dates, t, ctx): HeroSpec | null => {
    const d = dates.sinterklaas;
    if (!d?.pakjesavond) return null;
    const toPakjesavond = sleepsUntil(today, d.pakjesavond);
    if (toPakjesavond < 0) return null;

    // Count down to the arrival first, then to Pakjesavond
    let headline: string;
    const toIntocht = d.intocht ? sleepsUntil(today, d.intocht) : -1;
    if (toIntocht > 0) headline = t('sleepsUntilArrival', { n: toIntocht });
    else if (toIntocht === 0) headline = t('arrivesToday');
    else if (toPakjesavond > 0) headline = t('sleepsUntilPakjesavond', { n: toPakjesavond });
    else headline = t('pakjesavondToday');

    let subline = '';
    const toLocal = d.intocht_local ? sleepsUntil(today, d.intocht_local) : -1;
    if (toLocal > 0) subline = t('sleepsUntilLocalVisit', { n: toLocal });
    else if (toLocal === 0) {
      // Our own intocht: the boat arrives in Haarlem
      headline = t('sailsIntoHaarlem');
      const time = intochtTime(ctx.calendar);
      subline = time ? t('intochtAt', { time }) : t('intochtAround');
    } else if (isWithin(today, d.journaal_start, d.pakjesavond)) subline = t('journaalTonight');

    // The shoe chip wins on shoe nights; otherwise the children's goals replace "Shoe tonight? No"
    const shoeTonight = (d.shoe_nights ?? []).includes(today);
    const goals = goalChips(ctx.goals, '🍫');
    const secondary = shoeTonight || goals.length === 0
      ? [{ label: t('shoeTonight'), value: shoeTonight ? t('yes') : t('no') }]
      : goals;
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
    if ((d?.shoe_nights ?? []).includes(today)) {
      items.push(ritual('shoe', today, { emoji: '👟', title: t('putShoeOut'), start: '19:30' }));
    }
    return items;
  },
};
