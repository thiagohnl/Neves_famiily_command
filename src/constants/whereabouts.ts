export type Whereabout =
  | 'home'
  | 'school'
  | 'work'
  | 'church'
  | 'grandma'
  | 'playdate'
  | 'travelling'
  | 'sleeping';

export const WHEREABOUT_EMOJI: Record<Whereabout, string> = {
  home: '🏠',
  school: '🏫',
  work: '💼',
  church: '⛪',
  grandma: '👵',
  playdate: '🧒',
  travelling: '🚗',
  sleeping: '😴',
};

export const WHEREABOUT_LABEL: Record<Whereabout, string> = {
  home: 'Home',
  school: 'School',
  work: 'Work',
  church: 'Church',
  grandma: "Grandma's",
  playdate: 'Playdate',
  travelling: 'Travelling',
  sleeping: 'Sleeping',
};

/** Clock face positions, clockwise from the top in 45° steps. */
export const CLOCK_ORDER: Whereabout[] = [
  'school', 'playdate', 'work', 'travelling', 'sleeping', 'grandma', 'home', 'church',
];

export const isWhereabout = (value: unknown): value is Whereabout =>
  typeof value === 'string' && (CLOCK_ORDER as string[]).includes(value);
