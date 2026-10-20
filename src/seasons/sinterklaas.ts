import { TodayItem } from '../types/today';
import { HeroSpec, Season } from './types';
import { isWithin, sleepsUntil } from './dates';

const ritual = (id: string, today: string, item: Pick<TodayItem, 'emoji' | 'title' | 'start'>): TodayItem => ({
  id: `ritual-${id}-${today}`,
  kind: 'ritual',
  memberIds: [],
  isPast: false,
  isNow: false,
  ...item,
});

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
  hero: (today, dates, t): HeroSpec | null => {
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
    else if (toLocal === 0) subline = t('localVisitToday');
    else if (isWithin(today, d.journaal_start, d.pakjesavond)) subline = t('journaalTonight');

    const shoeTonight = (d.shoe_nights ?? []).includes(today);
    return {
      emoji: '🎁',
      headline,
      subline,
      chips: [
        { label: t('pakjesavond'), value: toPakjesavond === 0 ? t('tonight') : t('sleeps', { n: toPakjesavond }) },
        { label: t('shoeTonight'), value: shoeTonight ? t('yes') : t('no') },
      ],
    };
  },
  rituals: (today, dates, t) => {
    const d = dates.sinterklaas;
    const items: TodayItem[] = [];
    if (isWithin(today, d?.journaal_start, d?.pakjesavond)) {
      items.push(ritual('sinterklaasjournaal', today, { emoji: '📺', title: 'Sinterklaasjournaal', start: '18:00' }));
    }
    if ((d?.shoe_nights ?? []).includes(today)) {
      items.push(ritual('shoe', today, { emoji: '👟', title: t('putShoeOut'), start: '19:30' }));
    }
    return items;
  },
};
