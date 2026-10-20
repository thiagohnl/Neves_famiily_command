import { FamilyMember } from '../types';

// Members have no colour column; each one gets a colour by their position in the list
export const MEMBER_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Green
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple (repeat for more members)
];

export const memberColor = (members: FamilyMember[], memberId: string): string => {
  const index = members.findIndex(m => m.id === memberId);
  return MEMBER_COLORS[Math.max(index, 0) % MEMBER_COLORS.length];
};
