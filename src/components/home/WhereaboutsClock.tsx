import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { FamilyMember } from '../../types';
import { CLOCK_ORDER, Whereabout, WHEREABOUT_EMOJI, WHEREABOUT_LABEL } from '../../constants/whereabouts';
import { memberColor } from '../../constants/memberColors';
import { handSlots, MemberWhereabouts } from '../../lib/whereabouts';

const SIZE = 440;
const C = SIZE / 2;
const RING_R = 212; // 10 px stroke, so the inside edge is at 207
const GUIDE_R = 140;
const STEP_DEG = 360 / CLOCK_ORDER.length;

/**
 * Label blocks (emoji over word), placed by hand rather than on a circle: each
 * is anchored on its outer side and grows inwards, so even "Travelling" keeps
 * its outer corner about 10 px inside the ring. Side and diagonal labels are
 * anchored at their outer edge (end on the right, start on the left).
 */
const LABEL_POS: Record<Whereabout, { x: number; y: number; anchor: 'start' | 'middle' | 'end' }> = {
  school: { x: C, y: 50, anchor: 'middle' },
  playdate: { x: C + 128, y: 92, anchor: 'end' },
  work: { x: C + 192, y: C, anchor: 'end' },
  travelling: { x: C + 125, y: 350, anchor: 'end' },
  sleeping: { x: C, y: SIZE - 50, anchor: 'middle' },
  grandma: { x: C - 125, y: 350, anchor: 'start' },
  home: { x: C - 192, y: C, anchor: 'start' },
  church: { x: C - 128, y: 92, anchor: 'start' },
};

const statusAngle = (status: Whereabout) => CLOCK_ORDER.indexOf(status) * STEP_DEG;

/** Keeps a running angle so a hand takes the short way round (315° → 0° turns +45°, not -315°). */
const useShortestAngle = (target: number) => {
  const current = useRef(target);
  const delta = ((target - current.current) % 360 + 540) % 360 - 180;
  current.current += delta;
  return current.current;
};

// framer-motion rotates SVG groups about their bounding-box centre, so each
// rotating group gets an invisible circle centred on the pivot to put it there.
const Hand: React.FC<{
  member: FamilyMember;
  color: string;
  angle: number;
  length: number;
  avatarR: number;
  onSelect: () => void;
}> = ({ member, color, angle, length, avatarR, onSelect }) => {
  const rotate = useShortestAngle(angle);
  const spring = { type: 'spring' as const, stiffness: 70, damping: 14 };
  const clipId = `clock-avatar-${member.id}`;
  return (
    <motion.g animate={{ rotate }} initial={false} transition={spring}>
      <circle r={length + avatarR + 8} fill="none" />
      <line x1={0} y1={0} x2={0} y2={-length} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <g transform={`translate(0 ${-length})`}>
        {/* Counter-rotate so faces stay upright */}
        <motion.g
          animate={{ rotate: -rotate }}
          initial={false}
          transition={spring}
          onClick={onSelect}
          role="button"
          aria-label={`Where is ${member.name}?`}
          style={{ cursor: 'pointer' }}
        >
          <circle r={avatarR + (avatarR > 20 ? 4 : 3)} fill="#FFFFFF" />
          {member.photo_url ? (
            <>
              <clipPath id={clipId}><circle r={avatarR} /></clipPath>
              <image
                href={member.photo_url}
                x={-avatarR}
                y={-avatarR}
                width={avatarR * 2}
                height={avatarR * 2}
                clipPath={`url(#${clipId})`}
                preserveAspectRatio="xMidYMid slice"
              />
            </>
          ) : (
            <>
              <circle r={avatarR} fill={color} />
              <text textAnchor="middle" dominantBaseline="central" fontSize={avatarR * 1.1}>{member.avatar}</text>
            </>
          )}
        </motion.g>
      </g>
    </motion.g>
  );
};

interface WhereaboutsClockProps {
  familyMembers: FamilyMember[];
  whereabouts: Record<string, MemberWhereabouts>;
  clockEmoji?: Partial<Record<Whereabout, string>>;
  onSelectMember: (memberId: string) => void;
}

/** Weasley-style clock: one hand per member pointing at where they are. */
export const WhereaboutsClock: React.FC<WhereaboutsClockProps> = ({ familyMembers, whereabouts, clockEmoji, onSelectMember }) => {
  const slots = handSlots(
    familyMembers.map(m => ({ memberId: m.id, status: whereabouts[m.id]?.status ?? 'home' }))
  );

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Where everyone is" className="shrink-0 font-body">
      <circle cx={C} cy={C} r={RING_R} fill="#FFFFFF" style={{ stroke: 'var(--season-accent)' }} strokeWidth={10} />
      <circle cx={C} cy={C} r={GUIDE_R} fill="none" stroke="#E5E7EB" strokeWidth={2} strokeDasharray="6 6" />

      {CLOCK_ORDER.map(status => {
        const { x, y, anchor } = LABEL_POS[status];
        return (
          <g key={status}>
            <text x={x} y={y - 11} textAnchor={anchor} dominantBaseline="central" fontSize={22}>
              {clockEmoji?.[status] ?? WHEREABOUT_EMOJI[status]}
            </text>
            <text x={x} y={y + 12} textAnchor={anchor} dominantBaseline="central" fontSize={18} fontWeight={700} fill="#374151">
              {WHEREABOUT_LABEL[status]}
            </text>
          </g>
        );
      })}

      <g transform={`translate(${C} ${C})`}>
        {slots.map(slot => {
          const member = familyMembers.find(m => m.id === slot.memberId)!;
          return (
            <Hand
              key={member.id}
              member={member}
              color={memberColor(familyMembers, member.id)}
              angle={statusAngle(slot.status) + slot.offsetDeg}
              length={slot.length}
              avatarR={slot.avatarR}
              onSelect={() => onSelectMember(member.id)}
            />
          );
        })}
        <circle r={12} style={{ fill: 'var(--season-accent)' }} />
      </g>
    </svg>
  );
};
