import React from 'react';
import { motion } from 'framer-motion';
import { HeroSpec } from '../seasons';

// 'full' is the strip above the timeline layout; 'strip' fits the home layout's
// right column, where a 44 px headline would wrap to three lines.
const SIZES = {
  full: { box: 'px-6 py-4 gap-x-6', emoji: 'text-[64px]', headline: 'text-[44px]', subline: 'text-xl', chip: 'px-4 py-2 min-w-[120px]', value: 'text-2xl' },
  strip: { box: 'px-4 py-3 gap-x-4', emoji: 'text-5xl', headline: 'text-[28px]', subline: 'text-lg', chip: 'px-3 py-1 min-w-[96px]', value: 'text-xl' },
};

export const SeasonHero: React.FC<{ hero: HeroSpec; size?: keyof typeof SIZES }> = ({ hero, size = 'full' }) => {
  const s = SIZES[size];
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`w-full rounded-2xl bg-season-accent text-season-accent-text border-4 border-season-gold shadow-lg flex flex-wrap items-center gap-y-3 ${s.box}`}
      aria-label="Season"
    >
      <span className={`${s.emoji} leading-none`} aria-hidden="true">{hero.emoji}</span>
      <div className="flex-1 min-w-[240px]">
        <h2 className={`${s.headline} leading-tight font-extrabold`}>{hero.headline}</h2>
        {hero.subline && <p className={`${s.subline} font-medium opacity-90 mt-1`}>{hero.subline}</p>}
      </div>
      {hero.chips.length > 0 && (
        <div className="flex gap-3">
          {hero.chips.map(chip => (
            <div key={chip.label} className={`rounded-xl bg-white/15 border-2 border-season-gold text-center ${s.chip}`}>
              <div className="text-base font-semibold opacity-90">{chip.label}</div>
              <div className={`${s.value} font-extrabold`}>{chip.value}</div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
};
