import { handSlots, resolveWhereabouts, titleHasKeyword, WhereaboutsOverride, WhereaboutsRule } from '../../lib/whereabouts';
import { finalizeTodayItems } from '../../lib/todayItems';
import { FamilyMember } from '../../types';
import { TodayItem } from '../../types/today';

const member = (id: string, name: string, is_parent: boolean): FamilyMember => ({ id, name, avatar: '🙂', points: 0, is_parent });
const THIAGO = member('p1', 'Thiago', true);
const CAROL = member('p2', 'Carol', true);
const CHARLIE = member('k1', 'Charlie', false);
const ISABEL = member('k2', 'Isabel', false);
const MEMBERS = [THIAGO, CAROL, CHARLIE, ISABEL];

// Tuesday 20 October 2026, local time
const at = (hh: number, mm = 0) => new Date(2026, 9, 20, hh, mm);
const minutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

const rule = (keyword: string, status: WhereaboutsRule['status'], priority = 0, member_id: string | null = null): WhereaboutsRule => ({
  id: `r-${keyword}`, keyword, status, priority, member_id,
});
const SEED_RULES = [
  rule('school', 'school'), rule('playdate', 'playdate'), rule('church', 'church'),
  rule('work', 'work'), rule('office', 'work'), rule('WFH', 'home', 10),
  rule('vovó', 'grandma'), rule('grandma', 'grandma'),
  rule('travel', 'travelling'), rule('flight', 'travelling'), rule('train', 'travelling'),
];

const item = (title: string, start: string, end: string | undefined, memberIds: string[] = []): TodayItem => ({
  id: title, kind: 'google', emoji: '📅', title, start, end, memberIds, isPast: false, isNow: false,
});

const override = (
  member_id: string,
  status: WhereaboutsOverride['status'],
  source: WhereaboutsOverride['source'],
  set_at: Date,
  expires_at: Date | null
): WhereaboutsOverride => ({
  id: `${member_id}-${source}-${set_at.getTime()}`, member_id, status, source,
  set_at: set_at.toISOString(), expires_at: expires_at?.toISOString() ?? null,
});

describe('titleHasKeyword', () => {
  it('matches whole words case-insensitively, including accented ones', () => {
    expect(titleHasKeyword('Playdate at Jonas\'s house', 'playdate')).toBe(true);
    expect(titleHasKeyword('Carol WFH', 'wfh')).toBe(true);
    expect(titleHasKeyword('Almoço na Vovó', 'vovó')).toBe(true);
    expect(titleHasKeyword('Homework club', 'work')).toBe(false);
    expect(titleHasKeyword('Training', 'train')).toBe(false);
    expect(titleHasKeyword('Thiago @ Zaandam office', 'Zaandam office')).toBe(true);
    expect(titleHasKeyword('Anything', '  ')).toBe(false);
  });
});

describe('resolveWhereabouts', () => {
  it('Tuesday 16:10: playdate until 17:30, WFH at home, office at work, everyone else home', () => {
    const now = at(16, 10);
    const items = finalizeTodayItems([
      item('School drop off', '08:00', '08:30'),
      item('Playdate at Jonas\'s house', '15:30', '17:30', [CHARLIE.id]),
      item('WFH', '09:00', '17:00', [CAROL.id]),
      item('Thiago @ Zaandam office', '09:00', '17:30', [THIAGO.id]),
    ], minutes(now));
    const rules = [...SEED_RULES, rule('Zaandam office', 'work', 5, THIAGO.id)];

    const result = resolveWhereabouts(MEMBERS, [], rules, items, now);
    expect(result[CHARLIE.id]).toEqual({ status: 'playdate', source: 'calendar', label: '🧒 Playdate', until: '17:30' });
    expect(result[CAROL.id]).toMatchObject({ status: 'home', source: 'calendar', label: '🏠 Home', until: '17:00' });
    expect(result[THIAGO.id]).toMatchObject({ status: 'work', source: 'calendar', label: '💼 Work' });
    expect(result[ISABEL.id]).toEqual({ status: 'home', source: 'default', label: '🏠 Home' });
  });

  it('puts a manual override above presence, and presence above the calendar', () => {
    const now = at(16, 10);
    const items = finalizeTodayItems([item('Playdate', '15:30', '17:30', [CHARLIE.id])], minutes(now));
    const presence = override(CHARLIE.id, 'travelling', 'presence', at(16, 5), at(19));
    const manual = override(CHARLIE.id, 'grandma', 'manual', at(15), at(19));

    expect(resolveWhereabouts([CHARLIE], [presence], SEED_RULES, items, now)[CHARLIE.id])
      .toMatchObject({ status: 'travelling', source: 'presence' });
    expect(resolveWhereabouts([CHARLIE], [presence, manual], SEED_RULES, items, now)[CHARLIE.id])
      .toMatchObject({ status: 'grandma', source: 'manual', label: "👵 Grandma's" });
  });

  it('ignores expired overrides, and treats a null expiry as still active', () => {
    const now = at(16, 10);
    const expiredManual = override(THIAGO.id, 'church', 'manual', at(9), at(13));
    const presence = override(THIAGO.id, 'home', 'presence', at(16), null);
    expect(resolveWhereabouts([THIAGO], [expiredManual], [], [], now)[THIAGO.id].source).toBe('default');
    expect(resolveWhereabouts([THIAGO], [expiredManual, presence], [], [], now)[THIAGO.id])
      .toMatchObject({ status: 'home', source: 'presence' });
  });

  it('uses the newest override when two of the same source are active', () => {
    const now = at(12);
    const older = override(CAROL.id, 'work', 'presence', at(8), at(20));
    const newer = override(CAROL.id, 'home', 'presence', at(11), at(20));
    expect(resolveWhereabouts([CAROL], [older, newer], [], [], now)[CAROL.id].status).toBe('home');
  });

  it('applies the highest-priority matching rule, and member-specific rules only to that member', () => {
    const now = at(10);
    const items = finalizeTodayItems([item('WFH, work calls all day', '08:00', '18:00')], minutes(now));
    expect(resolveWhereabouts([CAROL], [], SEED_RULES, items, now)[CAROL.id].status).toBe('home');

    const gym = [rule('gym', 'travelling', 0, THIAGO.id)];
    const gymItems = finalizeTodayItems([item('Gym', '09:30', '11:00')], minutes(now));
    expect(resolveWhereabouts([THIAGO], [], gym, gymItems, now)[THIAGO.id].status).toBe('travelling');
    expect(resolveWhereabouts([CAROL], [], gym, gymItems, now)[CAROL.id].source).toBe('default');
  });

  it('only uses items happening now that belong to the member or the whole family', () => {
    const now = at(16, 10);
    const items = finalizeTodayItems([
      item('School drop off', '08:00', '08:30'),           // past
      item('Church choir', '19:00', '20:00'),              // later
      item('Isabel playdate', '15:00', '17:00', [ISABEL.id]),
    ], minutes(now));
    const result = resolveWhereabouts(MEMBERS, [], SEED_RULES, items, now);
    expect(result[CHARLIE.id].source).toBe('default');
    expect(result[ISABEL.id].status).toBe('playdate');
  });

  it('puts children to sleep from 20:00 to 07:00, parents stay home', () => {
    const sleepy = (d: Date) => resolveWhereabouts(MEMBERS, [], [], [], d);
    expect(sleepy(at(19, 59))[CHARLIE.id].status).toBe('home');
    expect(sleepy(at(20, 0))[CHARLIE.id]).toEqual({ status: 'sleeping', source: 'default', label: '😴 Sleeping' });
    expect(sleepy(at(6, 59))[ISABEL.id].status).toBe('sleeping');
    expect(sleepy(at(7, 0))[ISABEL.id].status).toBe('home');
    expect(sleepy(at(23, 0))[THIAGO.id].status).toBe('home');
  });

  it('uses season clock emoji in labels when given', () => {
    expect(resolveWhereabouts([THIAGO], [], [], [], at(12), { home: '🎄' })[THIAGO.id].label).toBe('🎄 Home');
  });
});

describe('handSlots', () => {
  it('shortens the second hand on a status by 45 px and fans out the rest', () => {
    const slots = handSlots([
      { memberId: 'a', status: 'home' },
      { memberId: 'b', status: 'home' },
      { memberId: 'c', status: 'school' },
      { memberId: 'd', status: 'home' },
    ]);
    expect(slots.map(s => [s.memberId, s.length, s.offsetDeg])).toEqual([
      ['a', 115, 0],
      ['b', 70, 0],
      ['c', 115, 0],
      ['d', 115, 28],
    ]);
  });
});
