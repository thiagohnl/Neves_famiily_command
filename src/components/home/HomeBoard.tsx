import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import dayjs from 'dayjs';
import { Chore, FamilyMember } from '../../types';
import { TodayItem } from '../../types/today';
import { useTodayItems } from '../../hooks/useTodayItems';
import { useBoardRefresh } from '../../hooks/useBoardRefresh';
import { useSeason } from '../../hooks/useSeason';
import { useFollowNowLine } from '../../hooks/useFollowNowLine';
import { ConfettiCelebration } from '../ConfettiCelebration';
import { RecipeViewModal } from '../RecipeViewModal';
import { SeasonHero } from '../SeasonHero';
import { VerseOfTheDayCard } from '../VerseOfTheDayCard';
import { WhereaboutsClockPlaceholder } from './WhereaboutsClockPlaceholder';
import { PointsLegend } from './PointsLegend';
import { TodayList } from './TodayList';

interface HomeBoardProps {
  familyMembers: FamilyMember[];
  chores: Chore[];
  onCompleteChore: (choreId: string, points: number, assignedTo: string) => Promise<boolean>;
}

/**
 * Board tab, home layout: whereabouts clock and points on the left, one merged
 * "Today" list on the right. Sized to the viewport so only the list scrolls.
 */
export const HomeBoard: React.FC<HomeBoardProps> = ({ familyMembers, chores, onCompleteChore }) => {
  const { today } = useBoardRefresh();
  const { hero } = useSeason();
  const { items, dinner, nowMinutes } = useTodayItems(chores, familyMembers);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recipeMealId, setRecipeMealId] = useState<string | null>(null);

  // Keep the NOW line about a third of the way down the list. Also re-follow when
  // the list changes: calendar and schedule rows arrive after the first render.
  useFollowNowLine(`${nowMinutes}|${items.length}`, container => container.clientHeight / 3);

  const handleComplete = async (item: TodayItem) => {
    if (!item.completable) return;
    const { choreId, points, assignedTo } = item.completable;
    if (await onCompleteChore(choreId, points, assignedTo)) setShowConfetti(true);
  };

  return (
    <div className="font-body flex flex-col md:flex-row gap-6 md:h-[calc(100vh-10rem)] md:min-h-[560px]">
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Left: clock (placeholder until the whereabouts clock lands) and points */}
      <section className="hidden md:flex w-[470px] shrink-0 flex-col items-center gap-5 pt-2" aria-label="Family">
        <WhereaboutsClockPlaceholder familyMembers={familyMembers} />
        <PointsLegend familyMembers={familyMembers} />
      </section>

      {/* Right: today */}
      <section className="flex-1 min-w-0 min-h-0 flex flex-col gap-3" aria-label="Today">
        <header className="flex items-center gap-4">
          <h2 className="font-display italic text-[40px] leading-none text-gray-900">Today</h2>
          <span className="text-lg text-gray-500 font-semibold">{dayjs(today).format('dddd D MMMM')}</span>
          {dinner && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => dinner.has_recipe && setRecipeMealId(dinner.saved_meal_id)}
              disabled={!dinner.has_recipe}
              className="ml-auto min-h-[44px] max-w-[45%] flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-4 text-lg font-semibold text-orange-800"
            >
              <span>{dinner.meal_emoji || '🍽️'}</span>
              <span className="truncate">Dinner: {dinner.meal_name}</span>
              {dinner.has_recipe && <BookOpen size={18} className="shrink-0 text-orange-600" />}
            </motion.button>
          )}
        </header>

        <div data-timeline-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
          <TodayList items={items} familyMembers={familyMembers} nowMinutes={nowMinutes} onComplete={handleComplete} />
        </div>

        {hero && <SeasonHero hero={hero} size="strip" />}
        {/* When the hero is showing and the screen is short, the verse gives way first */}
        <VerseOfTheDayCard variant="strip" className={hero ? '[@media(max-height:760px)]:hidden' : ''} />
      </section>

      <RecipeViewModal mealId={recipeMealId} onClose={() => setRecipeMealId(null)} />
    </div>
  );
};
