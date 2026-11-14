import { HeroContext, HeroSpec } from './types';

/** 0-100, rounded; a goal without a target counts as 0. */
export const goalPercent = (earned: number, target: number): number =>
  target > 0 ? Math.min(100, Math.max(0, Math.round((earned / target) * 100))) : 0;

/** One hero chip per child with a goal, e.g. { label: 'Charlie', value: '🍫 62%' }. */
export const goalChips = (goals: HeroContext['goals'], emoji: string): HeroSpec['chips'] =>
  goals
    .filter(goal => goal.target > 0)
    .map(goal => ({ label: goal.name, value: `${emoji} ${goalPercent(goal.earned, goal.target)}%` }));
