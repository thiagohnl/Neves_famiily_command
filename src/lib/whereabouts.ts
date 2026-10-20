// Pure whereabouts resolution: manual override > phone presence > calendar keyword > default.
import { FamilyMember } from '../types';
import { TodayItem } from '../types/today';
import { Whereabout, WHEREABOUT_EMOJI, WHEREABOUT_LABEL } from '../constants/whereabouts';

export interface WhereaboutsOverride {
  id: string;
  member_id: string;
  status: Whereabout;
  source: 'manual' | 'presence';
  set_at: string;
  expires_at: string | null;
}

export interface WhereaboutsRule {
  id: string;
  member_id: string | null;
  keyword: string;
  status: Whereabout;
  priority: number;
}

export interface MemberWhereabouts {
  status: Whereabout;
  source: 'manual' | 'presence' | 'calendar' | 'default';
  label: string;     // "🧒 Playdate"
  until?: string;    // HH:mm, from the calendar item's end
}

/** Children are asleep from 20:00 until 07:00 unless something says otherwise. */
const SLEEP_FROM_MIN = 20 * 60;
const SLEEP_UNTIL_MIN = 7 * 60;

const label = (status: Whereabout, emoji: Partial<Record<Whereabout, string>> = {}) =>
  `${emoji[status] ?? WHEREABOUT_EMOJI[status]} ${WHEREABOUT_LABEL[status]}`;

const isActive = (o: WhereaboutsOverride, now: Date) =>
  o.expires_at === null || new Date(o.expires_at).getTime() > now.getTime();

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whole-word, case-insensitive match that also works for accented words
 * ("vovó"), where \b would not: a letter or digit may not touch either side.
 */
export const titleHasKeyword = (title: string, keyword: string): boolean =>
  !!keyword.trim() &&
  new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(keyword.trim())}(?![\\p{L}\\p{N}])`, 'iu').test(title);

export const resolveWhereabouts = (
  members: FamilyMember[],
  overrides: WhereaboutsOverride[],
  rules: WhereaboutsRule[],
  todayItems: TodayItem[],
  now: Date,
  clockEmoji?: Partial<Record<Whereabout, string>>
): Record<string, MemberWhereabouts> => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const rulesByPriority = [...rules].sort((a, b) => b.priority - a.priority);
  const result: Record<string, MemberWhereabouts> = {};

  for (const member of members) {
    // 1. Override: manual beats presence, the newest of a source wins
    const override = overrides
      .filter(o => o.member_id === member.id && isActive(o, now))
      .sort((a, b) =>
        (a.source === b.source ? 0 : a.source === 'manual' ? -1 : 1) ||
        new Date(b.set_at).getTime() - new Date(a.set_at).getTime()
      )[0];
    if (override) {
      result[member.id] = { status: override.status, source: override.source, label: label(override.status, clockEmoji) };
      continue;
    }

    // 2. Calendar: something happening now for this member (or everyone) whose title matches a rule
    const current = todayItems.filter(i => i.isNow && (i.memberIds.length === 0 || i.memberIds.includes(member.id)));
    let match: { rule: WhereaboutsRule; item: TodayItem } | undefined;
    for (const rule of rulesByPriority) {
      if (rule.member_id && rule.member_id !== member.id) continue;
      const item = current.find(i => titleHasKeyword(i.title, rule.keyword));
      if (item) { match = { rule, item }; break; }
    }
    if (match) {
      result[member.id] = {
        status: match.rule.status,
        source: 'calendar',
        label: label(match.rule.status, clockEmoji),
        until: match.item.allDay ? undefined : match.item.end,
      };
      continue;
    }

    // 3. Default
    const asleep = !member.is_parent && (nowMinutes >= SLEEP_FROM_MIN || nowMinutes < SLEEP_UNTIL_MIN);
    const status: Whereabout = asleep ? 'sleeping' : 'home';
    result[member.id] = { status, source: 'default', label: label(status, clockEmoji) };
  }

  return result;
};

/**
 * Where each member's avatar sits, by how many share their status. One member
 * gets the full hand; two stack along it (the second 45 px shorter); three or
 * four form a tight cluster of slightly smaller faces aimed at the same label,
 * so nobody drifts towards a neighbouring status. 100 px keeps faces clear of
 * the labels. `avatarR` is the face radius (plus a white edge).
 */
export const HAND_LENGTH = 100;
const SHORT = HAND_LENGTH - 45;
type Slot = { offsetDeg: number; length: number; avatarR: number };
const LAYOUTS: Record<number, Slot[]> = {
  1: [{ offsetDeg: 0, length: HAND_LENGTH, avatarR: 26 }],
  2: [{ offsetDeg: 0, length: HAND_LENGTH, avatarR: 26 }, { offsetDeg: 0, length: SHORT, avatarR: 26 }],
  3: [
    { offsetDeg: -15, length: HAND_LENGTH, avatarR: 22 },
    { offsetDeg: 15, length: HAND_LENGTH, avatarR: 22 },
    { offsetDeg: 0, length: 56, avatarR: 22 },
  ],
  4: [
    { offsetDeg: -15, length: HAND_LENGTH, avatarR: 21 },
    { offsetDeg: 15, length: HAND_LENGTH, avatarR: 21 },
    { offsetDeg: -27, length: 56, avatarR: 21 },
    { offsetDeg: 27, length: 56, avatarR: 21 },
  ],
};

/** Five or more on one status: small faces spread over ±30° at full length. */
const crowdSlot = (k: number, n: number): Slot => ({
  offsetDeg: -30 + (60 * k) / (n - 1),
  length: HAND_LENGTH,
  avatarR: 16,
});

export const handSlots = (statusByMember: { memberId: string; status: Whereabout }[]) => {
  const groupSize = new Map<Whereabout, number>();
  statusByMember.forEach(({ status }) => groupSize.set(status, (groupSize.get(status) ?? 0) + 1));
  const seen = new Map<Whereabout, number>();
  return statusByMember.map(({ memberId, status }) => {
    const k = seen.get(status) ?? 0;
    seen.set(status, k + 1);
    const n = groupSize.get(status)!;
    return { memberId, status, ...(LAYOUTS[n]?.[k] ?? crowdSlot(k, n)) };
  });
};
