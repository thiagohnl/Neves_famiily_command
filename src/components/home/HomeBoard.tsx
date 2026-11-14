import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
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
import { useWhereabouts } from '../../hooks/useWhereabouts';
import { WhereaboutsClock } from './WhereaboutsClock';
import { WhereaboutsSheet } from './WhereaboutsSheet';
import { TodayList } from './TodayList';
import { SeasonCalendar } from './SeasonCalendar';
import { BirthdayTodayCell } from './BirthdayTodayCell';
import { birthdayIn, displayName } from '../../seasons/birthdays';
import { isIsoDate } from '../../seasons/dates';
import { playHurray } from '../../lib/hurray';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';
import { useSeasonGoals } from '../../hooks/useSeasonGoals';
import { bounceDay, canCrossDay, nextSpecialLine, seasonCalendar } from '../../seasons/calendar';
import { journaalSoonBanner } from '../../seasons/sinterklaas';
import { HeroContext } from '../../seasons';

interface HomeBoardProps {
  familyMembers: FamilyMember[];
  chores: Chore[];
  onCompleteChore: (choreId: string, points: number, assignedTo: string) => Promise<boolean>;
  isParentMode: boolean;
  /** This season's crossed-off calendar days (app_settings, via App). */
  crossedDays?: string[];
  onCrossDay?: (day: string, crossed: boolean) => void;
}

/**
 * Board tab, home layout: whereabouts clock and, during Sinterklaas or Christmas,
 * the season calendar on the left; one merged "Today" list on the right. Sized
 * to the viewport so only the list scrolls.
 */
export const HomeBoard: React.FC<HomeBoardProps> = ({
  familyMembers,
  chores,
  onCompleteChore,
  isParentMode,
  crossedDays = [],
  onCrossDay,
}) => {
  const { today } = useBoardRefresh();
  const { heroFor, season, goalSeason, dates, year, translate, birthdayIds } = useSeason();
  const { items, dinner, nowMinutes } = useTodayItems(chores, familyMembers);
  const { goals, bump } = useSeasonGoals(year);
  // Advent ✈️ days come from all-day Google events across 1-25 December
  const adventRange = goalSeason === 'christmas' ? [`${year}-12-01`, `${year}-12-25`] : [today, today];
  const { events: rangeEvents } = useGoogleCalendar(adventRange[0], adventRange[1]);
  const { whereabouts, setStatus } = useWhereabouts(familyMembers, items);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recipeMealId, setRecipeMealId] = useState<string | null>(null);
  const [whereaboutsMemberId, setWhereaboutsMemberId] = useState<string | null>(null);
  // Birthday confetti: once, silently, at the first render of the day; then on every tap of the
  // birthday person's face or hero photo, with a hurray (a tap is what lets the tablet play sound).
  // The counter remounts the confetti so a tap restarts it.
  const [birthdayConfetti, setBirthdayConfetti] = useState(0);
  const celebrate = () => setBirthdayConfetti(n => n + 1);
  const hurray = () => {
    celebrate();
    playHurray(translate.lang);
  };
  const birthdayKey = birthdayIds.join(',');
  const birthdayNames = familyMembers.filter(m => birthdayIds.includes(m.id)).map(m => displayName(m, translate));

  useEffect(() => {
    if (!birthdayKey) return;
    const flag = `birthday-confetti-${today}`;
    try {
      if (localStorage.getItem(flag)) return;
      localStorage.setItem(flag, '1');
    } catch {
      // Storage blocked: celebrate anyway, at most once per page load
    }
    celebrate();
  }, [today, birthdayKey]);

  // Keep the NOW line about a third of the way down the list. Also re-follow when
  // the list changes: calendar and schedule rows arrive after the first render.
  useFollowNowLine(`${nowMinutes}|${items.length}`, container => container.clientHeight / 3);

  const calendar = useMemo(() => {
    if (!goalSeason) return null;
    const allDay = rangeEvents.filter(e => e.allDay).map(e => ({ date: e.displayDate, title: e.title }));
    // 🎂 on family birthdays that fall inside the grid
    const birthdays = familyMembers
      .filter(m => isIsoDate(m.birth_date))
      .map(m => ({ date: birthdayIn(m.birth_date!, year), name: displayName(m, translate) }));
    return seasonCalendar(goalSeason, dates, year, translate, allDay, birthdays);
  }, [goalSeason, dates, year, translate, rangeEvents, familyMembers]);

  // Children's goals for this season, in family order, for the hero chips
  const heroContext: HeroContext = useMemo(() => ({
    calendar: items
      .filter(item => item.kind === 'google' || item.kind === 'event')
      .map(item => ({ title: item.title, start: item.start, allDay: item.allDay })),
    goals: familyMembers
      .filter(m => !m.is_parent)
      .flatMap(m => {
        const goal = goals.find(g => g.member_id === m.id && g.season_key === goalSeason);
        return goal && goal.target_points > 0 ? [{ name: m.name, earned: goal.earned_points, target: goal.target_points }] : [];
      }),
    nowMinutes,
  }), [items, familyMembers, goals, goalSeason, nowMinutes]);
  const hero = useMemo(() => heroFor(heroContext), [heroFor, heroContext]);
  const banner = journaalSoonBanner(items, nowMinutes, translate);

  const handleComplete = async (item: TodayItem) => {
    if (!item.completable) return;
    const { choreId, points, assignedTo } = item.completable;
    if (await onCompleteChore(choreId, points, assignedTo)) {
      setShowConfetti(true);
      if (goalSeason) bump(assignedTo, goalSeason, points);
    }
  };

  const handleToggleToday = (crossed: boolean) => {
    if (calendar && canCrossDay(calendar, today, today)) onCrossDay?.(today, crossed);
  };

  return (
    // Borrows 24 px of the page padding on md+ so the clock and a four-row calendar fit at 800 px
    <div className="font-body flex flex-col md:flex-row gap-6 md:h-[calc(100vh-8.5rem)] md:-mt-2 md:-mb-4 md:min-h-[560px]">
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
      {birthdayConfetti > 0 && (
        <ConfettiCelebration
          key={birthdayConfetti}
          show
          silent
          message={translate('happyBirthday', { name: birthdayNames.join(' & ') })}
          onComplete={() => setBirthdayConfetti(0)}
        />
      )}

      {/* Left: whereabouts clock, then the season calendar */}
      <section className="hidden md:flex w-[470px] shrink-0 flex-col items-center gap-2" aria-label="Family">
        <WhereaboutsClock
          familyMembers={familyMembers}
          whereabouts={whereabouts}
          clockEmoji={season?.clockEmoji}
          crownMemberIds={birthdayIds}
          /* The birthday face throws confetti and a hurray instead of opening the sheet */
          onSelectMember={id => (birthdayIds.includes(id) ? hurray() : setWhereaboutsMemberId(id))}
        />
        {calendar && birthdayIds.length > 0 && <BirthdayTodayCell label={translate('birthdayCell')} />}
        {calendar && birthdayIds.length === 0 && (
          <SeasonCalendar
            start={calendar.start}
            end={calendar.end}
            days={calendar.days}
            today={today}
            crossed={crossedDays}
            nextLine={nextSpecialLine(calendar, today, translate)}
            bounce={bounceDay(calendar, today)}
            onToggleToday={handleToggleToday}
          />
        )}
      </section>

      {/* Right: today */}
      <section className="flex-1 min-w-0 min-h-0 flex flex-col gap-3" aria-label="Today">
        <header className="flex items-center gap-4">
          <h2 className="font-display italic text-[40px] leading-none text-gray-900">Today</h2>
          {banner && (
            <span role="status" className="min-h-[44px] flex items-center rounded-full bg-season-accent text-season-accent-text px-4 text-lg font-bold">
              {banner}
            </span>
          )}
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

        {hero && <SeasonHero hero={hero} size="strip" onPhotoTap={hurray} />}
        {/* When the hero is showing and the screen is short, the verse gives way first; the tall birthday hero always wins */}
        <VerseOfTheDayCard variant="strip" className={hero?.photo ? 'hidden' : hero ? '[@media(max-height:760px)]:hidden' : ''} />
      </section>

      <RecipeViewModal mealId={recipeMealId} onClose={() => setRecipeMealId(null)} />
      <WhereaboutsSheet
        memberId={whereaboutsMemberId}
        familyMembers={familyMembers}
        whereabouts={whereabouts}
        isParentMode={isParentMode}
        onPick={setStatus}
        onClose={() => setWhereaboutsMemberId(null)}
      />
    </div>
  );
};
