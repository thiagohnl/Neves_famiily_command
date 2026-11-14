import React from 'react';
import { motion } from 'framer-motion';
import { HeroSpec } from '../seasons';

// 'full' is the strip above the timeline layout; 'strip' fits the home layout's
// right column, where a 44 px headline would wrap to three lines.
const SIZES = {
  full: { box: 'px-6 py-4 gap-x-6', emoji: 'text-[64px]', headline: 'text-[44px]', subline: 'text-xl', chip: 'px-4 py-2 min-w-[120px]', value: 'text-2xl', photo: 140 },
  strip: { box: 'px-4 py-3 gap-x-4', emoji: 'text-5xl', headline: 'text-[28px]', subline: 'text-lg', chip: 'px-3 py-1 min-w-[96px]', value: 'text-xl', photo: 112 },
};

interface SeasonHeroProps {
  hero: HeroSpec;
  size?: keyof typeof SIZES;
  /** Tapping the birthday photo (confetti). */
  onPhotoTap?: () => void;
}

export const SeasonHero: React.FC<SeasonHeroProps> = ({ hero, size = 'full', onPhotoTap }) => {
  const s = SIZES[size];
  const photo = hero.photo;
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`w-full rounded-2xl bg-season-accent text-season-accent-text border-4 border-season-gold shadow-lg flex flex-wrap items-center gap-y-3 ${s.box}`}
      aria-label="Season"
    >
      {photo ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onPhotoTap}
          className="shrink-0 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center"
          style={{ width: s.photo, height: s.photo, backgroundColor: photo.color }}
          aria-label={`${photo.name}: celebrate!`}
        >
          {photo.url
            ? <img src={photo.url} alt="" className="w-full h-full object-cover" />
            : <span className="text-[64px] leading-none" aria-hidden="true">{photo.avatar}</span>}
        </motion.button>
      ) : (
        <span className={`${s.emoji} leading-none`} aria-hidden="true">{hero.emoji}</span>
      )}
      <div className="flex-1 min-w-[240px]">
        {hero.headlineBig ? (
          <h2 className={`${s.headline} leading-tight font-extrabold`} aria-label={hero.headline}>
            {hero.headlineBig.before}
            <span className="text-[96px] leading-none align-middle mx-1">{hero.headlineBig.big}</span>
            {hero.headlineBig.after}
          </h2>
        ) : (
          <h2 className={`${s.headline} leading-tight font-extrabold`}>{hero.headline}</h2>
        )}
        {hero.subline && <p className={`${s.subline} font-medium opacity-90 mt-1`}>{hero.subline}</p>}
      </div>
      {hero.chips.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {hero.chips.map((chip, i) => (
            <div key={`${chip.label}|${chip.value}|${i}`} className={`rounded-xl bg-white/15 border-2 border-season-gold text-center ${s.chip}`}>
              {chip.label && <div className="text-base font-semibold opacity-90">{chip.label}</div>}
              <div className={`${chip.label ? s.value : 'text-lg'} font-extrabold`}>{chip.value}</div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
};
