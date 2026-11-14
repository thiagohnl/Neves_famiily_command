import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDay } from '../../seasons/calendar';

interface SeasonCalendarProps {
  start: string;
  end: string;
  days: Record<string, CalendarDay>;
  today: string;
  /** Days crossed off by tapping (or automatically at midnight). */
  crossed: string[];
  /** "🥾 Wellies tomorrow night!" etc., in the season language. */
  nextLine: string | null;
  /** Tapping today's cell toggles it. */
  onToggleToday: (crossed: boolean) => void;
  /** The next special cell (🥾, 🎂, 🎁): the only one that bounces. */
  bounce?: string | null;
}

// Shown as text, not the emoji variant, so it takes the accent colour
const CROSS = '✖︎';
// Faint wash of the season gold (#D4A017 in both Sinterklaas and Christmas)
const GOLD_BG = 'rgba(212, 160, 23, 0.18)';

/**
 * Run-up calendar under the clock: emoji cells from the season's first day in
 * order, 7 per row, no weekday alignment and no dates. Past days are faded and crossed; today has
 * a pulsing 4 px accent ring with a 👇 above it and can be tapped to cross it off. Only the next
 * special cell bounces; nothing else moves.
 */
export const SeasonCalendar: React.FC<SeasonCalendarProps> = ({ days, today, crossed, nextLine, onToggleToday, bounce }) => {
  const crossedSet = new Set(crossed);
  const dayKeys = Object.keys(days).sort();

  return (
    <div className="flex flex-col items-center gap-1" aria-label="Season calendar">
      <ol className="grid grid-cols-7 gap-0.5">
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
            const label = `${info.label}${showCross ? ', done' : ''}`;
            if (day === bounce) {
              // The next special day: a 4 px hop every 3 seconds
              return (
                <motion.li
                  key={day}
                  className={cellClass}
                  style={style}
                  aria-label={`${label}, next`}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeOut' }}
                >
                  {content}
                </motion.li>
              );
            }
            return (
              <li key={day} className={cellClass} style={style} aria-label={label}>
                {content}
              </li>
            );
          }
          return (
            <li key={day} className="relative">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[14px] leading-none z-10 pointer-events-none" aria-hidden="true">👇</span>
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
                  className="absolute inset-0 rounded-lg border-4 border-season-accent pointer-events-none"
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
