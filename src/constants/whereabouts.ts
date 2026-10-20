export type Whereabout =
  | 'home'
  | 'school'
  | 'work'
  | 'church'
  | 'playdate'
  | 'football'
  | 'sleeping';

export const WHEREABOUT_EMOJI: Record<Whereabout, string> = {
  home: '🏠',
  school: '🏫',
  work: '💼',
  church: '⛪',
  playdate: '🧒',
  football: '⚽',
  sleeping: '😴',
};

export const WHEREABOUT_LABEL: Record<Whereabout, string> = {
  home: 'Home',
  school: 'School',
  work: 'Work',
  church: 'Church',
  playdate: 'Playdate',
  football: 'Football',
  sleeping: 'Sleeping',
};

/**
 * Clock face positions, clockwise from the top in equal steps. Short words
 * (Work, Home) sit at the sides, where a label runs straight towards the faces.
 */
export const CLOCK_ORDER: Whereabout[] = [
  'school', 'playdate', 'work', 'football', 'sleeping', 'home', 'church',
];

export const isWhereabout = (value: unknown): value is Whereabout =>
  typeof value === 'string' && (CLOCK_ORDER as string[]).includes(value);
