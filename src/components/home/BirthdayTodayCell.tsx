import React from 'react';

/**
 * Takes the season calendar's place on a birthday: one large cell, "🎂 TODAY".
 * Sized like the three-row Sinterklaas grid (7 × 44 px + gaps, 3 rows) so the column barely moves.
 */
export const BirthdayTodayCell: React.FC<{ label: string }> = ({ label }) => (
  <div
    className="w-[320px] h-[136px] rounded-2xl border-[3px] border-season-accent flex flex-col items-center justify-center gap-1"
    style={{ backgroundColor: 'rgba(212, 160, 23, 0.18)' }}
    aria-label={`🎂 ${label}`}
  >
    <span className="text-[60px] leading-none" aria-hidden="true">🎂</span>
    <span className="text-[36px] font-extrabold tracking-wide text-gray-900">{label}</span>
  </div>
);
