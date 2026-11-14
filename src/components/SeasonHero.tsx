import React from 'react';
import { motion } from 'framer-motion';
import { HeroSpec, SeasonIllustration } from '../seasons';

// 'full' is the strip above the timeline layout; 'strip' fits the home layout's
// right column, where a 44 px headline would wrap to three lines.
// Illustration: 170 px tall, bottom on the card's bottom padding, 20 px above the card's top edge.
const ILLO_HEIGHT = 170;
const ILLO_OVERFLOW = 20;
const ILLO_GAP = 24;

const SIZES = {
  full: { pad: 16, box: 'px-6 py-4 gap-x-6', emoji: 'text-[64px]', headline: 'text-[44px]', subline: 'text-xl', chip: 'px-4 py-2 min-w-[120px]', value: 'text-2xl', photo: 140 },
  strip: { pad: 12, box: 'px-4 py-3 gap-x-4', emoji: 'text-5xl', headline: 'text-[28px]', subline: 'text-lg', chip: 'px-3 py-1 min-w-[96px]', value: 'text-xl', photo: 112 },
};

interface SeasonHeroProps {
  hero: HeroSpec;
  size?: keyof typeof SIZES;
  /** Tapping the birthday photo (confetti). */
  onPhotoTap?: () => void;
  /** The season's picture at the right end of the card (hidden under 1100 px wide). */
  illustration?: SeasonIllustration | null;
}

export const SeasonHero: React.FC<SeasonHeroProps> = ({ hero, size = 'full', onPhotoTap, illustration }) => {
  const s = SIZES[size];
  const photo = hero.photo;
  const illo = illustration ?? null;
  const illoWidth = illo ? Math.round((illo.width * ILLO_HEIGHT) / illo.height) : 0;
  // Card tall enough that the picture pokes exactly 20 px above it; text and chips keep clear of it
  const illoStyle = illo
    ? ({
        '--illo-pad': `${illoWidth + ILLO_GAP}px`,
        '--illo-min-h': `${ILLO_HEIGHT - ILLO_OVERFLOW + s.pad}px`,
      } as React.CSSProperties)
    : undefined;
  const illoBox = illo
    ? 'relative min-[1100px]:pr-[var(--illo-pad)] min-[1100px]:min-h-[var(--illo-min-h)] min-[1100px]:mt-5'
    : '';
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`w-full rounded-2xl bg-season-accent text-season-accent-text border-4 border-season-gold shadow-lg flex flex-wrap items-center gap-y-3 ${s.box} ${illoBox}`}
      style={illoStyle}
      aria-label="Season"
    >
      {illo && (
        <picture
          className="hidden min-[1100px]:block absolute pointer-events-none"
          style={{ right: s.pad, bottom: s.pad, height: ILLO_HEIGHT, width: illoWidth }}
          data-tone={illo.tone}
        >
          {illo.fallbackSrc && <source srcSet={illo.src} type={illo.src.endsWith('.webp') ? 'image/webp' : undefined} />}
          <img
            src={illo.fallbackSrc ?? illo.src}
            alt={illo.alt}
            width={illo.width}
            height={illo.height}
            className="h-full w-auto max-w-none drop-shadow-md"
            draggable={false}
          />
        </picture>
      )}
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
            <div
              key={`${chip.label}|${chip.value}|${i}`}
              className={`rounded-xl border-2 border-season-gold text-center ${chip.gold ? 'bg-season-gold text-gray-900' : 'bg-white/15'} ${s.chip}`}
            >
              {chip.label && <div className="text-base font-semibold opacity-90">{chip.label}</div>}
              <div className={`${chip.label ? s.value : 'text-lg'} font-extrabold`}>{chip.value}</div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
};
