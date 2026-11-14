import { Season } from './types';
import { sleepsUntil } from './dates';
import { goalChips } from './goals';

export const christmas: Season = {
  key: 'christmas',
  name: 'Christmas',
  emoji: '🎄',
  // 6 to 26 December, every year (the day after Pakjesavond)
  isActive: (today) => {
    const monthDay = today.slice(5);
    return monthDay >= '12-06' && monthDay <= '12-26';
  },
  palette: {
    bg: '#FBF6EA', // cream
    surface: '#FFFDF7',
    accent: '#1F5B3F', // green
    accentText: '#FFFFFF',
    button: '#1F5B3F',
    gold: '#D4A017',
  },
  hero: (today, _dates, t, ctx) => {
    const year = Number(today.slice(0, 4));
    const toChristmas = sleepsUntil(today, `${year}-12-25`);
    return {
      emoji: '🎄',
      headline: toChristmas > 0 ? t('sleepsUntilChristmas', { n: toChristmas }) : t('merryChristmas'),
      subline: '',
      chips: goalChips(ctx.goals, '🎁'),
    };
  },
  rituals: () => [],
};
