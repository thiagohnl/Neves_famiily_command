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
