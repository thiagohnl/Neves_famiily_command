import React from 'react';
import { FamilyMember } from '../../types';
import { memberColor } from '../../constants/memberColors';

/** Colour dot, name and points per member; the full leaderboard stays on the Chores tab. */
export const PointsLegend: React.FC<{ familyMembers: FamilyMember[] }> = ({ familyMembers }) => (
  <ul className="grid grid-cols-2 gap-x-6 gap-y-2 w-full px-4" aria-label="Points">
    {familyMembers.map(member => (
      <li key={member.id} className="flex items-center gap-2 text-lg min-w-0">
        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: memberColor(familyMembers, member.id) }} />
        <span className="font-bold text-gray-800 truncate">{member.name}</span>
        <span className="ml-auto font-semibold text-gray-600 shrink-0">⭐ {member.points}</span>
      </li>
    ))}
  </ul>
);
