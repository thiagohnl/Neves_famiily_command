import {
  activityItems,
  buildTodayItems,
  choreItems,
  emojiForTitle,
  finalizeTodayItems,
  membersInTitle,
  normalizeTime,
  nowLineIndex,
  TodaySources,
} from '../../lib/todayItems';
import { scheduleEventsForDay, ScheduleEvent } from '../useScheduleEvents';
import { Activity, Chore, FamilyMember, PlannedActivity } from '../../types';
import { TodayItem } from '../../types/today';

const TODAY = '2026-10-20'; // a Tuesday
const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const member = (id: string, name: string): FamilyMember => ({ id, name, avatar: '🙂', points: 0, is_parent: false });
const MEMBERS = [member('p1', 'Thiago'), member('p2', 'Carol'), member('k1', 'Charlie'), member('k2', 'Isabel')];

const chore = (over: Partial<Chore>): Chore => ({
  id: 'c', name: 'Chore', assigned_to: 'k1', points: 10, is_completed: false, ...over,
});

const sources = (over: Partial<TodaySources> = {}): TodaySources => ({
  today: TODAY,
  chores: [],
  members: MEMBERS,
  scheduleEvents: [],
  googleEvents: [],
  activities: [],
  plannedActivities: [],
  funIdeas: [],
  dinner: null,
  rituals: [],
  ...over,
});

const item = (over: Partial<TodayItem>): TodayItem => ({
  id: 'x', kind: 'event', emoji: '📅', title: 'x', start: '09:00', memberIds: [], isPast: false, isNow: false, ...over,
});

describe('normalizeTime', () => {
  it('accepts HH:mm and Postgres HH:mm:ss, rejects junk', () => {
    expect(normalizeTime('07:30')).toBe('07:30');
    expect(normalizeTime('7:05:00')).toBe('07:05');
    expect(normalizeTime('morning')).toBeNull();
    expect(normalizeTime(undefined)).toBeNull();
  });
});

describe('emojiForTitle and membersInTitle', () => {
  it('maps calendar keywords to emoji with a calendar default', () => {
    expect(emojiForTitle('Playdate at Jonas\'s house')).toBe('🧒');
    expect(emojiForTitle('School drop off')).toBe('🏫');
    expect(emojiForTitle('Dentist Isabel')).toBe('🦷');
    expect(emojiForTitle('Church')).toBe('⛪');
    expect(emojiForTitle('Work trip')).toBe('💼');
    expect(emojiForTitle('Homework club')).toBe('📅');
    expect(emojiForTitle('Haircut')).toBe('📅');
  });

  it('finds family members named in a title as whole words', () => {
    expect(membersInTitle('Charlie playdate at Jonas\'s', MEMBERS)).toEqual(['k1']);
    expect(membersInTitle('Charlies party', MEMBERS)).toEqual([]);
    expect(membersInTitle('Carol & Thiago dinner', MEMBERS)).toEqual(['p1', 'p2']);
  });
});

describe('choreItems', () => {
  it('keeps chores due today with a time, and marks open ones completable', () => {
    const items = choreItems([
      chore({ id: 'a', scheduled_time: '08:00:00', recurring_days: ['Tuesday'] }),
      chore({ id: 'b', scheduled_time: '08:00', recurring_days: ['Monday'] }),
      chore({ id: 'c', scheduled_time: undefined }),
      chore({ id: 'd', scheduled_time: '18:00' }),
    ], MEMBERS, TODAY);
    expect(items.map(i => i.id)).toEqual(['chore-a', 'chore-d']);
    expect(items[0]).toMatchObject({
      start: '08:00',
      subtitle: 'Chore, 10 points',
      memberIds: ['k1'],
      completable: { choreId: 'a', points: 10, assignedTo: 'k1' },
    });
  });

  it('shows a chore completed today as past, and drops one completed on an earlier day', () => {
    const items = choreItems([
      chore({ id: 'today', scheduled_time: '08:00', is_completed: true, completed_at: '2026-10-20T08:05:00' }),
      chore({ id: 'old', scheduled_time: '08:00', is_completed: true, completed_at: '2026-10-12T08:05:00' }),
    ], MEMBERS, TODAY);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'chore-today', isPast: true });
    expect(items[0].completable).toBeUndefined();
  });
});

describe('scheduleEventsForDay', () => {
  const ev = (over: Partial<ScheduleEvent>): ScheduleEvent => ({
    id: 'e', title: 'e', date: null, start_time: '09:00', end_time: '10:00',
    assigned_member_ids: [], is_recurring: false, recurring_days: [], color: '#000', ...over,
  });

  it('picks dated events for the day and recurring ones on its weekday', () => {
    const events = [
      ev({ id: 'dated', date: TODAY }),
      ev({ id: 'other-day', date: '2026-10-21' }),
      ev({ id: 'tuesdays', is_recurring: true, recurring_days: ['Tuesday'] }),
      ev({ id: 'mondays', is_recurring: true, recurring_days: ['Monday'] }),
    ];
    expect(scheduleEventsForDay(events, TODAY).map(e => e.id)).toEqual(['dated', 'tuesdays']);
  });
});

describe('activityItems', () => {
  const swim: Activity = { id: 'swim', name: 'Swimming', category: 'Sport', emoji: '🏊', start_time: '16:00', end_time: '17:00' };
  const football: Activity = { ...swim, id: 'foot', name: 'Football', emoji: '⚽', recurring_days: ['Tuesday'], assigned_member_ids: ['k1', 'k2'] };

  it('merges planned and recurring activities into one item per activity', () => {
    const planned: PlannedActivity[] = [
      { id: 'p1', activity_id: 'swim', date: TODAY, member_id: 'k1', activity: swim },
      { id: 'p2', activity_id: 'swim', date: TODAY, member_id: 'k2', activity: swim },
      { id: 'p3', activity_id: 'swim', date: '2026-10-19', member_id: 'k1', activity: swim },
    ];
    const items = activityItems([swim, football], planned, TODAY);
    expect(items.map(i => [i.title, i.memberIds])).toEqual([
      ['Swimming', ['k1', 'k2']],
      ['Football', ['k1', 'k2']],
    ]);
    expect(items[0]).toMatchObject({ start: '16:00', end: '17:00', subtitle: 'Until 17:00, Sport' });
  });
});

describe('finalizeTodayItems and nowLineIndex', () => {
  it('works out past and now, with a 30 minute default length', () => {
    const [done, current, later] = finalizeTodayItems([
      item({ id: 'later', start: '17:00' }),
      item({ id: 'done', start: '08:00', end: '08:30' }),
      item({ id: 'current', start: '15:30', end: '17:30' }),
    ], at('16:10'));
    expect([done.id, done.isPast, done.isNow]).toEqual(['done', true, false]);
    expect([current.id, current.isPast, current.isNow]).toEqual(['current', false, true]);
    expect([later.id, later.isPast, later.isNow]).toEqual(['later', false, false]);

    const [noEnd] = finalizeTodayItems([item({ start: '16:00' })], at('16:29'));
    expect(noEnd.isNow).toBe(true);
    expect(finalizeTodayItems([item({ start: '16:00' })], at('16:30'))[0].isPast).toBe(true);
  });

  it('keeps an overdue chore open until it is completed', () => {
    const [overdue] = finalizeTodayItems([item({ kind: 'chore', start: '08:00', isPast: false })], at('16:10'));
    expect(overdue.isPast).toBe(false);
  });

  it('lists all-day items first and never as past', () => {
    const items = finalizeTodayItems([
      item({ id: 'timed', start: '07:00' }),
      item({ id: 'allday', allDay: true, start: '00:00' }),
    ], at('23:00'));
    expect(items.map(i => i.id)).toEqual(['allday', 'timed']);
    expect(items[0].isPast).toBe(false);
  });

  it('puts the NOW line before the first timed item that has not started', () => {
    const items = finalizeTodayItems([
      item({ id: 'a', allDay: true, start: '00:00' }),
      item({ id: 'b', start: '08:00' }),
      item({ id: 'c', start: '15:30', end: '17:30' }),
      item({ id: 'd', start: '18:00' }),
    ], at('16:10'));
    expect(nowLineIndex(items, at('16:10'))).toBe(3);
    expect(nowLineIndex(items, at('06:00'))).toBe(1);
    expect(nowLineIndex(items, at('23:00'))).toBe(4);
  });
});

describe('buildTodayItems', () => {
  it('merges a weekday: school runs, a playdate, chores, dinner and rituals in time order', () => {
    const items = buildTodayItems(sources({
      chores: [chore({ id: 'bed', name: 'Arrumar a cama', scheduled_time: '07:30', points: 5, recurring_days: ['Tuesday'] })],
      googleEvents: [
        { id: 'g1', title: 'School drop off', displayDate: TODAY, start_time: '08:00', end_time: '08:30', allDay: false },
        { id: 'g2', title: 'School pick up', displayDate: TODAY, start_time: '15:00', end_time: '15:15', allDay: false },
        { id: 'g3', title: 'Charlie playdate at Jonas\'s house', displayDate: TODAY, start_time: '15:30', end_time: '17:30', allDay: false, location: 'Mama picks up' },
        { id: 'g4', title: 'Tomorrow', displayDate: '2026-10-21', start_time: '09:00', end_time: '10:00', allDay: false },
      ],
      dinner: { id: 'd1', meal_name: 'Lasanha', meal_emoji: '🍝' },
      rituals: [item({ id: 'ritual-journaal', kind: 'ritual', emoji: '📺', title: 'Sinterklaasjournaal', start: '18:00' })],
    }), at('16:10'));

    expect(items.map(i => [i.start, i.title])).toEqual([
      ['07:30', 'Arrumar a cama'],
      ['08:00', 'School drop off'],
      ['15:00', 'School pick up'],
      ['15:30', 'Charlie playdate at Jonas\'s house'],
      ['16:30', 'Dinner prep: Lasanha'],
      ['18:00', 'Sinterklaasjournaal'],
    ]);

    const byTitle = (t: string) => items.find(i => i.title === t)!;
    expect(byTitle('School drop off')).toMatchObject({ isPast: true, emoji: '🏫' });
    expect(byTitle('Charlie playdate at Jonas\'s house')).toMatchObject({
      isNow: true, emoji: '🧒', memberIds: ['k1'], subtitle: 'Until 17:30, Mama picks up',
    });
    expect(byTitle('Arrumar a cama').completable).toEqual({ choreId: 'bed', points: 5, assignedTo: 'k1' });
    expect(byTitle('Arrumar a cama').isPast).toBe(false);
    expect(byTitle('Dinner prep: Lasanha').kind).toBe('meal');
  });

  it('skips the dinner prep item when the calendar already has a dinner entry', () => {
    const items = buildTodayItems(sources({
      googleEvents: [{ id: 'g', title: 'Dinner prep', displayDate: TODAY, start_time: '16:30', end_time: '17:00', allDay: false }],
      dinner: { id: 'd1', meal_name: 'Tacos' },
    }), at('12:00'));
    expect(items.map(i => i.title)).toEqual(['Dinner prep']);
  });

  it('adds no dinner item when no dinner is planned', () => {
    expect(buildTodayItems(sources(), at('12:00'))).toEqual([]);
  });
});
