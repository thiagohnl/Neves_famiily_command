import React from 'react';
import { FamilyMember } from '../../types';
import { memberColor } from '../../constants/memberColors';
import { MemberAvatar } from './MemberAvatar';

const SIZE = 420;
const RADIUS = 140;
const AVATAR = 76;

/** Stand-in for the whereabouts clock: the family's faces around a ring. */
export const WhereaboutsClockPlaceholder: React.FC<{ familyMembers: FamilyMember[] }> = ({ familyMembers }) => (
  <div
    className="relative rounded-full border-[10px] border-season-accent bg-white shadow-lg shrink-0"
    style={{ width: SIZE, height: SIZE }}
    aria-label="Family"
  >
    <div className="absolute inset-6 rounded-full border-2 border-dashed border-gray-200" />
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <span className="text-6xl">🏠</span>
      <span className="text-lg font-bold text-gray-500 mt-1">Where is everyone?</span>
    </div>
    {familyMembers.map((member, i) => {
      // Start at the top and go clockwise
      const angle = (i / Math.max(familyMembers.length, 1)) * 2 * Math.PI - Math.PI / 2;
      const center = SIZE / 2 - 10; // inside the 10 px border
      return (
        <div
          key={member.id}
          className="absolute flex flex-col items-center"
          style={{
            left: center + RADIUS * Math.cos(angle) - AVATAR / 2,
            top: center + RADIUS * Math.sin(angle) - AVATAR / 2,
            width: AVATAR,
          }}
        >
          <MemberAvatar member={member} color={memberColor(familyMembers, member.id)} size={AVATAR} className="border-4 border-white shadow" />
        </div>
      );
    })}
  </div>
);
