import React from 'react';
import { FamilyMember } from '../../types';
import { memberColor } from '../../constants/memberColors';
import { MemberWhereabouts } from '../../lib/whereabouts';

interface PointsLegendProps {
  familyMembers: FamilyMember[];
  whereabouts?: Record<string, MemberWhereabouts>;
  onSelectMember?: (memberId: string) => void;
}

/**
 * Colour dot, name and points per member, plus where they are; tapping a row
 * opens the whereabouts sheet. The full leaderboard stays on the Chores tab.
 */
export const PointsLegend: React.FC<PointsLegendProps> = ({ familyMembers, whereabouts, onSelectMember }) => (
  <ul className="grid grid-cols-2 gap-x-6 gap-y-1 w-full px-4" aria-label="Points">
    {familyMembers.map(member => {
      const where = whereabouts?.[member.id];
      return (
        <li key={member.id}>
          <button
            type="button"
            onClick={() => onSelectMember?.(member.id)}
            className="w-full min-h-[44px] text-left rounded-xl px-1 py-1"
          >
            <span className="flex items-center gap-2 text-lg min-w-0">
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: memberColor(familyMembers, member.id) }} />
              <span className="font-bold text-gray-800 truncate">{member.name}</span>
              <span className="ml-auto font-semibold text-gray-600 shrink-0">⭐ {member.points}</span>
            </span>
            {where && (
              <span className="block pl-6 text-base text-gray-500 truncate">
                {where.label}{where.until ? ` · until ${where.until}` : ''}
              </span>
            )}
          </button>
        </li>
      );
    })}
  </ul>
);
