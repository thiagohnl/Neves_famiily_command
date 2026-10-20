import { Season } from './types';
import { sleepsUntil } from './dates';

export const christmas: Season = {
  key: 'christmas',
  name: 'Christmas',
  emoji: '🎄',
  // 6 to 26 December, every year
  isActive: (today) => {
    const monthDay = today.slice(5);
    return monthDay >= '12-06' && monthDay <= '12-26';
  },
  palette: {
    bg: '#EEF5EF',
    surface: '#FFFFFF',
    accent: '#1F6B3A',
    accentText: '#FFFFFF',
    button: '#1F6B3A',
    gold: '#C9A227',
  },
  hero: (today, _dates, t) => {
    const year = Number(today.slice(0, 4));
    const toChristmas = sleepsUntil(today, `${year}-12-25`);
    return {
      emoji: '🎄',
      headline: toChristmas > 0 ? t('sleepsUntilChristmas', { n: toChristmas }) : t('merryChristmas'),
      subline: '',
      chips: [],
    };
  },
  rituals: () => [],
};
