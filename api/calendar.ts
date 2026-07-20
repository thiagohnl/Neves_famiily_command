// api/calendar.ts — Vercel Serverless Function
// Read-only Google Calendar feed for the family board.
//
// Fetches the secret iCal URL (GOOGLE_CALENDAR_ICS_URL env var), expands
// recurring events for the requested range, and returns a compact JSON list.
// The secret URL never reaches the browser — only parsed events do.
import ical from 'node-ical';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_EVENTS = 500;

interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO instant for timed events, YYYY-MM-DD for all-day
  end: string;   // ISO instant for timed events, YYYY-MM-DD (exclusive) for all-day
  allDay: boolean;
  location?: string;
}

/** Minutes east of UTC for `timeZone` at instant `date`. */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
  );
  return (asUTC - date.getTime()) / 60_000;
}

const dateKey = (d: Date) => d.toISOString().substring(0, 10);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const icsUrl = process.env.GOOGLE_CALENDAR_ICS_URL;
  if (!icsUrl) {
    // Not an error: the board simply hasn't connected a calendar yet.
    return res.status(200).json({ configured: false, events: [] });
  }

  // Range: default from a week ago to 5 weeks ahead
  const now = new Date();
  const rangeStart = req.query.start
    ? new Date(`${req.query.start}T00:00:00Z`)
    : new Date(now.getTime() - 7 * 86_400_000);
  const rangeEnd = req.query.end
    ? new Date(`${req.query.end}T23:59:59Z`)
    : new Date(now.getTime() + 35 * 86_400_000);
  if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
    return res.status(400).json({ error: 'Invalid start/end date' });
  }

  try {
    const data = await ical.async.fromURL(icsUrl);
    const events: CalendarEvent[] = [];

    for (const key of Object.keys(data)) {
      const ev: any = (data as any)[key];
      if (ev.type !== 'VEVENT' || !ev.start) continue;

      const isAllDay = ev.datetype === 'date';
      const durationMs =
        (ev.end?.getTime() ?? ev.start.getTime()) - ev.start.getTime();

      const pushEvent = (start: Date, end: Date, idSuffix = '') => {
        if (end <= rangeStart || start >= rangeEnd) return;
        events.push(
          isAllDay
            ? {
                id: `${ev.uid || key}${idSuffix}`,
                title: ev.summary || '(untitled)',
                start: dateKey(start),
                end: dateKey(end > start ? end : new Date(start.getTime() + 86_400_000)),
                allDay: true,
                ...(ev.location ? { location: ev.location } : {}),
              }
            : {
                id: `${ev.uid || key}${idSuffix}`,
                title: ev.summary || '(untitled)',
                start: start.toISOString(),
                end: end.toISOString(),
                allDay: false,
                ...(ev.location ? { location: ev.location } : {}),
              },
        );
      };

      if (ev.rrule) {
        const tzid: string | undefined = ev.rrule.origOptions?.tzid;
        const offsetAtDtstart = tzid ? tzOffsetMinutes(ev.start, tzid) : 0;
        // Widen the window so long events starting before the range still show
        const searchStart = new Date(rangeStart.getTime() - Math.max(durationMs, 0) - 86_400_000);

        for (const occurrence of ev.rrule.between(searchStart, rangeEnd, true)) {
          const k = dateKey(occurrence);
          if (ev.exdate && ev.exdate[k]) continue; // cancelled instance

          const override = ev.recurrences?.[k];
          if (override) {
            // Instance was edited individually — use its own times
            const oEnd = override.end
              ? override.end
              : new Date(override.start.getTime() + durationMs);
            pushEvent(override.start, oEnd, `-${k}`);
            continue;
          }

          let start = occurrence;
          if (tzid && !isAllDay) {
            // rrule keeps DTSTART's UTC clock time; shift by the DST delta so
            // a 09:00 Amsterdam event stays 09:00 across the summer/winter switch
            const delta = offsetAtDtstart - tzOffsetMinutes(occurrence, tzid);
            start = new Date(occurrence.getTime() + delta * 60_000);
          }
          pushEvent(start, new Date(start.getTime() + durationMs), `-${k}`);
        }
      } else {
        pushEvent(ev.start, ev.end ?? ev.start);
      }

      if (events.length >= MAX_EVENTS) break;
    }

    events.sort((a, b) => a.start.localeCompare(b.start));

    // Let Vercel's edge cache absorb the wall tablet's polling
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ configured: true, events: events.slice(0, MAX_EVENTS) });
  } catch (error: any) {
    console.error('Calendar fetch error:', error?.message || error);
    return res.status(502).json({ error: 'Failed to fetch calendar feed' });
  }
}
