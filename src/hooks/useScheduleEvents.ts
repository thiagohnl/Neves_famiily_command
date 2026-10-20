import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { data } from '../lib/dataGateway';
import { useBoardRefresh } from './useBoardRefresh';

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string | null;
  start_time: string;
  end_time: string;
  assigned_member_ids: string[];
  is_recurring: boolean;
  recurring_days: string[];
  color: string;
  notes?: string;
}

/** Events happening on `day` (YYYY-MM-DD): recurring on that weekday, or dated that day. */
export const scheduleEventsForDay = (events: ScheduleEvent[], day: string): ScheduleEvent[] => {
  const dayName = dayjs(day).format('dddd');
  return events.filter(e =>
    e.is_recurring ? (e.recurring_days ?? []).includes(dayName) : e.date === day
  );
};

/**
 * Schedule tab events for `today`, reloaded on every board refresh tick.
 * Shared by TodaysScheduleCard (timeline layout) and useTodayItems (home layout).
 */
export function useScheduleEvents(today: string) {
  const { tick } = useBoardRefresh();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Only the first load shows a spinner; later refreshes update in place
    data.listScheduleEvents()
      .then(rows => { if (!cancelled) setEvents(rows as ScheduleEvent[]); })
      .catch(err => console.error('Error fetching events:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  const todaysEvents = useMemo(() => scheduleEventsForDay(events, today), [events, today]);

  return { events, todaysEvents, loading };
}
