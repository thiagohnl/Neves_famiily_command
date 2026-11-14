import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDay, leadingBlanks } from '../../seasons/calendar';

interface SeasonCalendarProps {
  start: string;
  end: string;
  days: Record<string, CalendarDay>;
  today: string;
  /** Days crossed off by tapping (or automatically at midnight). */
  crossed: string[];
  /** "👟 Shoe night: tomorrow" etc., in the season language. */
  nextLine: string | null;
  /** Tapping today's cell toggles it. */
  onToggleToday: (crossed: boolean) => void;
}

// Shown as text, not the emoji variant, so it takes the accent colour
const CROSS = '✖︎';
// Faint wash of the season gold (#D4A017 in both Sinterklaas and Christmas)
const GOLD_BG = 'rgba(212, 160, 23, 0.18)';

/**
 * Run-up calendar under the clock: Monday-to-Sunday columns of emoji cells, no
 * dates. Past days are faded and crossed; today has a pulsing accent ring and
 * can be tapped to cross it off.
 */
export const SeasonCalendar: React.FC<SeasonCalendarProps> = ({ start, days, today, crossed, nextLine, onToggleToday }) => {
  const crossedSet = new Set(crossed);
  const dayKeys = Object.keys(days).sort();

  return (
    <div className="flex flex-col items-center gap-1" aria-label="Season calendar">
      <ol className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: leadingBlanks(start) }, (_, i) => (
          <li key={`blank-${i}`} className="w-11 h-11" aria-hidden="true" />
        ))}
        {dayKeys.map(day => {
          const info = days[day];
          const isToday = day === today;
          const isPast = day < today;
          // Past days always read as done; today only once tapped
          const showCross = isPast || (isToday && crossedSet.has(day));
          const content = (
            <>
              <span className={`text-[26px] leading-none ${isPast ? 'opacity-40' : ''}`} aria-hidden="true">{info.emoji}</span>
              {showCross && (
                <span className="absolute inset-0 flex items-center justify-center text-[30px] font-black text-season-accent" aria-hidden="true">
                  {CROSS}
                </span>
              )}
            </>
          );
          const cellClass = 'relative w-11 h-11 rounded-lg flex items-center justify-center';
          const style = info.gold ? { backgroundColor: GOLD_BG } : undefined;

          if (!isToday) {
            return (
              <li key={day} className={cellClass} style={style} aria-label={`${info.label}${showCross ? ', done' : ''}`}>
                {content}
              </li>
            );
          }
          return (
            <li key={day}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => onToggleToday(!crossedSet.has(day))}
                className={cellClass}
                style={style}
                aria-pressed={crossedSet.has(day)}
                aria-label={`Today: ${info.label}`}
              >
                {content}
                <motion.span
                  className="absolute inset-0 rounded-lg border-[3px] border-season-accent pointer-events-none"
                  animate={{ scale: [1, 1.12, 1], opacity: [1, 0.55, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
                  aria-hidden="true"
                />
              </motion.button>
            </li>
          );
        })}
      </ol>
      {nextLine && <p className="text-[20px] leading-5 font-bold text-gray-800 text-center">{nextLine}</p>}
    </div>
  );
};
