import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

/** A Google Calendar event expanded to one entry per visible day, in local time. */
export interface GoogleCalEvent {
  id: string;
  title: string;
  displayDate: string; // YYYY-MM-DD (local)
  start_time: string;  // HH:mm (local)
  end_time: string;    // HH:mm (local)
  allDay: boolean;
  location?: string;
}

interface ApiEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}

const REFRESH_MS = 5 * 60_000; // wall-tablet friendly: re-sync every 5 minutes

/**
 * Read-only Google Calendar events for [rangeStart, rangeEnd] (YYYY-MM-DD,
 * inclusive). Fails silently — a missing/unconfigured feed never breaks the board.
 */
export function useGoogleCalendar(rangeStart: string, rangeEnd: string) {
  const [events, setEvents] = useState<GoogleCalEvent[]>([]);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/calendar?start=${rangeStart}&end=${rangeEnd}`);
        if (!res.ok) return; // dev server without functions, or feed error — stay silent
        const body = await res.json();
        if (cancelled || !body?.configured) return;

        const expanded: GoogleCalEvent[] = [];
        for (const ev of (body.events || []) as ApiEvent[]) {
          if (ev.allDay) {
            // One chip per day; `end` is exclusive per iCal convention
            let day = dayjs(ev.start);
            const end = dayjs(ev.end);
            while (day.isBefore(end)) {
              const date = day.format('YYYY-MM-DD');
              if (date >= rangeStart && date <= rangeEnd) {
                expanded.push({
                  id: ev.id, title: ev.title, displayDate: date,
                  start_time: '00:00', end_time: '23:59',
                  allDay: true, location: ev.location,
                });
              }
              day = day.add(1, 'day');
            }
          } else {
            const start = dayjs(ev.start); // ISO instant → local time
            let end = dayjs(ev.end);
            if (!end.isSame(start, 'day')) end = start.endOf('day'); // clamp overnight events
            expanded.push({
              id: ev.id, title: ev.title,
              displayDate: start.format('YYYY-MM-DD'),
              start_time: start.format('HH:mm'),
              end_time: end.format('HH:mm'),
              allDay: false, location: ev.location,
            });
          }
        }

        setEvents(expanded);
        setConfigured(true);
      } catch {
        // network hiccup — keep whatever we had
      }
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [rangeStart, rangeEnd]);

  return { events, configured };
}
