import React from 'react';
import { FamilyMember } from '../../types';

/** Round photo, or the member's emoji on their colour when there is no photo. */
export const MemberAvatar: React.FC<{ member: FamilyMember; color: string; size: number; className?: string }> = ({
  member,
  color,
  size,
  className = '',
}) =>
  member.photo_url ? (
    <img
      src={member.photo_url}
      alt={member.name}
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      role="img"
      aria-label={member.name}
      className={`rounded-full shrink-0 flex items-center justify-center ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.55 }}
    >
      {member.avatar}
    </span>
  );
