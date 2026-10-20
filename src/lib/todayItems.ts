// Pure helpers that merge every source of "what's happening today" into one
// sorted TodayItem list. The hook (useTodayItems) only gathers the inputs.
import dayjs from 'dayjs';
import { Activity, Chore, FamilyMember, PlannedActivity } from '../types';
import { TodayItem } from '../types/today';
import { getChoreEmoji } from '../constants/chore_emojis';
import { memberColor } from '../constants/memberColors';
import type { ScheduleEvent } from '../hooks/useScheduleEvents';
import type { GoogleCalEvent } from '../hooks/useGoogleCalendar';
import type { FunIdea } from '../hooks/useFunIdeas';

/** Items without an end time count as "now" for this long after they start. */
export const DEFAULT_DURATION_MIN = 30;
export const DINNER_PREP_TIME = '16:30';
const GOOGLE_COLOR = '#4285F4';

/** 'HH:mm' or 'HH:mm:ss' (Postgres time) → 'HH:mm'; anything else → null. */
export const normalizeTime = (value?: string | null): string | null => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
};

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Calendar title keyword → emoji; first match wins. */
const TITLE_EMOJI: [RegExp, string][] = [
  [/play ?date|speelafspraak/i, '🧒'],
  [/school|escola|drop.?off|pick.?up/i, '🏫'],
  [/dentist|tandarts|dentista/i, '🦷'],
  [/church|igreja|kerk/i, '⛪'],
  [/\bwork\b|\boffice\b|trabalho|\bwerk\b/i, '💼'],
];

export const emojiForTitle = (title: string): string =>
  TITLE_EMOJI.find(([pattern]) => pattern.test(title))?.[1] ?? '📅';

/** Members named in a calendar title ("Charlie playdate at Jonas's"); Google events carry no assignees. */
export const membersInTitle = (title: string, members: FamilyMember[]): string[] =>
  members
    .filter(m => m.name && new RegExp(`\\b${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(title))
    .map(m => m.id);

const untilSubtitle = (end?: string | null, extra?: string | null) =>
  [end ? `Until ${end}` : null, extra?.trim() || null].filter(Boolean).join(', ') || undefined;

/** Same day filter as the timeline board, plus chores already completed today (shown muted). */
export const choreItems = (chores: Chore[], members: FamilyMember[], today: string): TodayItem[] => {
  const todayName = dayjs(today).format('dddd');
  return chores.flatMap(chore => {
    const start = normalizeTime(chore.scheduled_time);
    if (!start) return [];
    const recurs = chore.recurring_days?.length ? chore.recurring_days.includes(todayName) : true;
    if (!recurs) return [];
    // A one-off chore finished on an earlier day is done for good
    if (chore.is_completed && (!chore.completed_at || dayjs(chore.completed_at).format('YYYY-MM-DD') !== today)) return [];
    const item: TodayItem = {
      id: `chore-${chore.id}`,
      kind: 'chore',
      emoji: getChoreEmoji(chore),
      title: chore.name,
      subtitle: `Chore, ${chore.points} points`,
      start,
      end: normalizeTime(chore.end_time) ?? undefined,
      memberIds: [chore.assigned_to],
      color: memberColor(members, chore.assigned_to),
      isPast: chore.is_completed,
      isNow: false,
    };
    if (!chore.is_completed) {
      item.completable = { choreId: chore.id, points: chore.points, assignedTo: chore.assigned_to };
    }
    return [item];
  });
};

/** `events` must already be filtered to today (see scheduleEventsForDay). */
export const scheduleItems = (events: ScheduleEvent[]): TodayItem[] =>
  events.flatMap(event => {
    const start = normalizeTime(event.start_time);
    if (!start) return [];
    const end = normalizeTime(event.end_time) ?? undefined;
    return [{
      id: `event-${event.id}`,
      kind: 'event' as const,
      emoji: emojiForTitle(event.title),
      title: event.title,
      subtitle: untilSubtitle(end, event.notes),
      start,
      end,
      memberIds: event.assigned_member_ids ?? [],
      color: event.color,
      isPast: false,
      isNow: false,
    }];
  });

export const googleItems = (events: GoogleCalEvent[], members: FamilyMember[], today: string): TodayItem[] =>
  events
    .filter(e => e.displayDate === today)
    .map(e => ({
      id: `google-${e.id}`,
      kind: 'google' as const,
      emoji: emojiForTitle(e.title),
      // Kept as typed so "Playdate at Jonas's house" still names the host
      title: e.title,
      subtitle: e.allDay ? e.location || undefined : untilSubtitle(e.end_time, e.location),
      start: e.allDay ? '00:00' : e.start_time,
      end: e.allDay ? undefined : e.end_time,
      allDay: e.allDay || undefined,
      memberIds: membersInTitle(e.title, members),
      color: GOOGLE_COLOR,
      isPast: false,
      isNow: false,
    }));

/** Planned activities for today plus recurring ones, one item per activity with all its members. */
export const activityItems = (
  activities: Activity[],
  planned: PlannedActivity[],
  today: string
): TodayItem[] => {
  const todayName = dayjs(today).format('dddd');
  const byActivity = new Map<string, { activity: Activity; memberIds: Set<string> }>();
  const add = (activity: Activity | undefined, memberId: string) => {
    if (!activity) return;
    const entry = byActivity.get(activity.id) ?? { activity, memberIds: new Set<string>() };
    if (memberId) entry.memberIds.add(memberId);
    byActivity.set(activity.id, entry);
  };
  planned.filter(pa => pa.date === today).forEach(pa => add(pa.activity, pa.member_id));
  activities
    .filter(a => a.recurring_days?.includes(todayName))
    .forEach(a => (a.assigned_member_ids?.length ? a.assigned_member_ids : ['']).forEach(id => add(a, id)));

  return Array.from(byActivity.values()).map(({ activity, memberIds }) => {
    const start = normalizeTime(activity.start_time);
    return {
      id: `activity-${activity.id}`,
      kind: 'activity' as const,
      emoji: activity.emoji || '🎯',
      title: activity.name,
      subtitle: untilSubtitle(start ? normalizeTime(activity.end_time) : null, activity.category),
      start: start ?? '00:00',
      end: start ? normalizeTime(activity.end_time) ?? undefined : undefined,
      allDay: start ? undefined : true,
      memberIds: Array.from(memberIds),
      color: activity.color,
      isPast: false,
      isNow: false,
    };
  });
};

export const funItems = (ideas: FunIdea[], today: string): TodayItem[] =>
  ideas
    .filter(idea => idea.scheduled_date === today)
    .map(idea => ({
      id: `fun-${idea.id}`,
      kind: 'fun' as const,
      emoji: idea.emoji || '🎯',
      title: idea.name,
      subtitle: idea.location || undefined,
      start: '00:00',
      allDay: true,
      memberIds: [],
      isPast: false,
      isNow: false,
    }));

export interface PlannedDinner {
  id: string;
  meal_name: string;
  meal_emoji?: string;
  sides?: string[];
}

export const dinnerItem = (dinner: PlannedDinner | null | undefined): TodayItem[] =>
  dinner
    ? [{
        id: `meal-${dinner.id}`,
        kind: 'meal',
        emoji: dinner.meal_emoji || '🍽️',
        title: `Dinner prep: ${dinner.meal_name}`,
        subtitle: dinner.sides?.length ? `With ${dinner.sides.join(', ')}` : undefined,
        start: DINNER_PREP_TIME,
        memberIds: [],
        isPast: false,
        isNow: false,
      }]
    : [];

/**
 * Fills in isPast/isNow for `nowMinutes` and sorts: all-day items first, then by start.
 * A chore is past only once completed, so an overdue chore keeps its Done button.
 */
export const finalizeTodayItems = (items: TodayItem[], nowMinutes: number): TodayItem[] =>
  items
    .map(item => {
      if (item.allDay) return { ...item, isPast: false, isNow: true };
      const start = toMinutes(item.start);
      const end = item.end ? toMinutes(item.end) : start + DEFAULT_DURATION_MIN;
      const inProgress = start <= nowMinutes && nowMinutes < end;
      const isPast = item.kind === 'chore' ? item.isPast : nowMinutes >= end;
      return { ...item, isPast, isNow: inProgress && !isPast };
    })
    .sort((a, b) => {
      if (!!a.allDay !== !!b.allDay) return a.allDay ? -1 : 1;
      return toMinutes(a.start) - toMinutes(b.start) || a.title.localeCompare(b.title);
    });

/** Index in a finalized list where the NOW line goes: before the first timed item that hasn't started. */
export const nowLineIndex = (items: TodayItem[], nowMinutes: number): number => {
  const index = items.findIndex(item => !item.allDay && toMinutes(item.start) > nowMinutes);
  return index === -1 ? items.length : index;
};

export interface TodaySources {
  today: string;
  chores: Chore[];
  members: FamilyMember[];
  scheduleEvents: ScheduleEvent[];
  googleEvents: GoogleCalEvent[];
  activities: Activity[];
  plannedActivities: PlannedActivity[];
  funIdeas: FunIdea[];
  dinner: PlannedDinner | null;
  rituals: TodayItem[];
}

const DINNER_IN_TITLE = /dinner|jantar|avondeten/i;

export const buildTodayItems = (src: TodaySources, nowMinutes: number): TodayItem[] => {
  const calendar = [
    ...scheduleItems(src.scheduleEvents),
    ...googleItems(src.googleEvents, src.members, src.today),
  ];
  // A calendar entry like "Dinner prep" already covers it; don't add a second dinner row
  const dinnerOnCalendar = calendar.some(item => DINNER_IN_TITLE.test(item.title));
  return finalizeTodayItems(
    [
      ...choreItems(src.chores, src.members, src.today),
      ...calendar,
      ...activityItems(src.activities, src.plannedActivities, src.today),
      ...funItems(src.funIdeas, src.today),
      ...(dinnerOnCalendar ? [] : dinnerItem(src.dinner)),
      ...src.rituals,
    ],
    nowMinutes
  );
};
