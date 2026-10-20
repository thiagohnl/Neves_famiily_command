/** One row of the merged "Today" list on the Board (calendar, chores, rituals...). */
export interface TodayItem {
  id: string;
  kind: 'chore' | 'event' | 'google' | 'activity' | 'fun' | 'meal' | 'ritual';
  emoji: string;
  title: string;
  subtitle?: string;        // "Until 17:30, Mama picks up", "Chore, 20 points"
  start: string;            // HH:mm ('00:00' when allDay)
  end?: string;             // HH:mm
  /** No specific time (all-day calendar event, fun idea): listed first, never past. */
  allDay?: boolean;
  memberIds: string[];      // empty means whole family
  color?: string;
  isPast: boolean;
  isNow: boolean;
  completable?: { choreId: string; points: number; assignedTo: string };
}
