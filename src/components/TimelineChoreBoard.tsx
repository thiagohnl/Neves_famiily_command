import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Trophy, Utensils, MapPin, Calendar } from 'lucide-react';
import { FamilyMember, Chore, Activity, PlannedActivity } from '../types';
import { ConfettiCelebration } from './ConfettiCelebration';
import { TodaysScheduleCard } from './TodaysScheduleCard';
import { VerseOfTheDayCard } from './VerseOfTheDayCard';
import { CallFamilyCard } from './CallFamilyCard';
import { useTodayMeal } from '../hooks/useMeals';
import { useActivities } from '../hooks/useActivities';
import { useFunIdeas } from '../hooks/useFunIdeas';
import { getChoreEmoji } from '../constants/chore_emojis';
import dayjs from 'dayjs';

// --- Helper Functions ---
const timeToMinutes = (timeStr: string = "00:00"): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const PIXELS_PER_MINUTE = 2;
const TIMELINE_START_HOUR = 7;

// --- Sub-components ---
const TodaysMeals: React.FC = () => {
  const { lunch, dinner, loading } = useTodayMeal();
  if (loading) return <div className="text-orange-700 text-base">Loading...</div>;
  if (!lunch && !dinner) return <div className="text-orange-700 text-base">No meals planned</div>;
  const withSides = (meal: any) =>
    meal.meal_name + (meal.sides?.length ? ` + ${meal.sides.join(', ')}` : '');
  return (
    <div className="space-y-1">
      {lunch && <div className="text-sm font-medium text-orange-800">🍽️ Lunch: {withSides(lunch)}</div>}
      {dinner && <div className="text-sm font-medium text-orange-800">🍽️ Dinner: {withSides(dinner)}</div>}
    </div>
  );
};

const TodaysFun: React.FC<{ plannedActivities: PlannedActivity[]; funIdeasToday: any[] }> = ({ plannedActivities, funIdeasToday }) => {
  if (plannedActivities.length === 0 && funIdeasToday.length === 0) {
    return <div className="text-green-700 text-base">No activity planned</div>;
  }
  return (
    <div className="space-y-1">
      {plannedActivities.length > 0 && (
        <div className="text-sm font-medium text-green-800">{plannedActivities[0].activity.emoji} {plannedActivities[0].activity.name}</div>
      )}
      {funIdeasToday.map(idea => (
        <div key={idea.id} className="text-sm font-medium text-green-800">{idea.emoji} {idea.name}</div>
      ))}
    </div>
  );
};

// --- Main Component ---
export const TimelineChoreBoard: React.FC<{
  familyMembers: FamilyMember[];
  chores: Chore[];
  onCompleteChore: (choreId: string, points: number, assignedTo: string) => Promise<boolean>;
}> = ({ familyMembers, chores, onCompleteChore }) => {
  const { activities, plannedActivities } = useActivities();
  const { ideas: funIdeas } = useFunIdeas();
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // The timeline scrolls inside its own window and follows the current time.
  // A manual scroll pauses the auto-follow for 2 minutes so it doesn't fight the user.
  const lastUserScroll = React.useRef(0);
  const isAutoScroll = React.useRef(false);

  React.useEffect(() => {
    const containers = Array.from(document.querySelectorAll<HTMLElement>('[data-timeline-scroll]'));
    const onScroll = () => { if (!isAutoScroll.current) lastUserScroll.current = Date.now(); };
    containers.forEach(c => c.addEventListener('scroll', onScroll, { passive: true }));
    return () => containers.forEach(c => c.removeEventListener('scroll', onScroll));
  }, []);

  React.useEffect(() => {
    if (Date.now() - lastUserScroll.current < 120000) return;
    const t = setTimeout(() => {
      const containers = document.querySelectorAll<HTMLElement>('[data-timeline-scroll]');
      for (const container of Array.from(containers)) {
        if (container.offsetParent === null) continue;
        const line = container.querySelector<HTMLElement>('[data-now-line]');
        if (!line) continue;
        const lineTop = line.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
        isAutoScroll.current = true;
        container.scrollTo({ top: Math.max(0, lineTop - 160), behavior: 'smooth' });
        setTimeout(() => { isAutoScroll.current = false; }, 1000);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [currentTime]);

  const today = dayjs();
  const todayName = today.format('dddd');
  const todayDate = today.format('YYYY-MM-DD');

  const funIdeasToday = React.useMemo(() => {
    return funIdeas.filter(idea => idea.scheduled_date === todayDate);
  }, [funIdeas, todayDate]);
  
  const todaysPlannedActivities = React.useMemo(() => {
    const specific = plannedActivities.filter(pa => pa.date === todayDate);
    const recurring = activities
      .filter(a => a.recurring_days?.includes(todayName))
      .flatMap(activity => (activity.assigned_member_ids || []).map(member_id => ({
        id: `recurring-${activity.id}-${member_id}`,
        activity_id: activity.id,
        date: todayDate,
        member_id,
        activity,
      } as PlannedActivity)));
    return [...specific, ...recurring];
  }, [activities, plannedActivities, todayName, todayDate]);

  const timeSlots = React.useMemo(() => Array.from({ length: 15 }, (_, i) => TIMELINE_START_HOUR + i), []);
  const currentTimePosition = (timeToMinutes(dayjs(currentTime).format('HH:mm')) - timeToMinutes(`${TIMELINE_START_HOUR}:00`)) * PIXELS_PER_MINUTE;

  const handleCompleteChore = async (choreId: string, points: number, assignedTo: string) => {
    const success = await onCompleteChore(choreId, points, assignedTo);
    if (success) {
      setShowConfetti(true);
    }
  };

  return (
    <div className="space-y-6">
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
      {/* Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 shadow-sm border border-gray-200 z-10 flex flex-col"><div className="flex items-center gap-3 mb-2"><Trophy className="text-purple-600" /><h3 className="font-bold text-purple-800 text-lg">Family Progress</h3></div><div className="flex-1 flex flex-col justify-center"><div className="grid grid-cols-2 gap-2">{familyMembers.map(m => (<div key={m.id} className="text-center"><img src={m.photo_url || `https://ui-avatars.com/api/?name=${m.name.charAt(0)}&background=random`} alt={m.name} className="w-10 h-10 rounded-full mx-auto object-cover" /><p className="text-xs font-bold">{m.name}</p><p className="text-xs">{m.points} pts</p></div>))}</div></div></div>
        <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-2xl p-4 shadow-sm border border-gray-200 z-10 flex flex-col"><div className="flex items-center gap-3 mb-2"><Utensils className="text-orange-600" /><h3 className="font-bold text-orange-800 text-lg">Meal of the Day</h3></div><div className="flex-1 flex flex-col justify-center"><TodaysMeals /></div></div>
        <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl p-4 shadow-sm border border-gray-200 z-10 flex flex-col"><div className="flex items-center gap-3 mb-2"><MapPin className="text-green-600" /><h3 className="font-bold text-green-800 text-lg">Today's Fun</h3></div><div className="flex-1 flex flex-col justify-center"><TodaysFun plannedActivities={todaysPlannedActivities} funIdeasToday={funIdeasToday} /></div></div>
        <TodaysScheduleCard
          familyMembers={familyMembers}
        />
        <VerseOfTheDayCard />
      </motion.div>

      {/* Call Family */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <CallFamilyCard />
      </motion.div>

      {/* Timeline */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card z-10">
        <div className="flex items-center gap-3 mb-4"><CheckCircle className="text-blue-500" /><h2 className="text-2xl font-bold text-gray-800">Today's Chores</h2></div>

        {/* Mobile: member selector tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 sm:hidden">
          {familyMembers.map(member => {
            const isActive = selectedMemberId === member.id || (!selectedMemberId && familyMembers[0]?.id === member.id);
            return (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-purple-100 ring-2 ring-purple-400' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <img src={member.photo_url || `https://ui-avatars.com/api/?name=${member.name.charAt(0)}&background=random`} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                <span className="text-xs font-bold">{member.name}</span>
              </button>
            );
          })}
        </div>

        {(() => {
          const activeMemberId = selectedMemberId || familyMembers[0]?.id;
          const mobileMembers = familyMembers.filter(m => m.id === activeMemberId);
          const desktopMembers = familyMembers;

          const renderTimeline = (members: FamilyMember[]) => (
            <div>
              {/* Sticky faces header (hidden on mobile since we have the selector) */}
              <div className="sticky top-0 z-40 bg-white flex">
                <div className="w-16 shrink-0"></div>
                <div className="flex-1 min-w-0 grid" style={{ gridTemplateColumns: `repeat(${members.length}, 1fr)` }}>
                  {members.map(member => (
                    <div key={member.id} className="text-center bg-white px-2 py-2 hidden sm:block">
                      <img src={member.photo_url || `https://ui-avatars.com/api/?name=${member.name.charAt(0)}&background=random`} alt={member.name} className="w-12 h-12 rounded-full mx-auto object-cover" />
                      <p className="font-bold text-sm mt-2">{member.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex mt-4">
                {/* Time Gutter — labels share the grid's coordinate system, centered on their hour line */}
                <div className="w-16 shrink-0 relative" style={{ height: `${timeSlots.length * 60 * PIXELS_PER_MINUTE}px` }}>
                  {timeSlots.map((hour, i) => (
                    <div key={hour} className="absolute right-4 -translate-y-1/2" style={{ top: `${i * 60 * PIXELS_PER_MINUTE}px` }}>
                      <span className="text-sm font-bold text-gray-400">{dayjs().hour(hour).format('ha')}</span>
                    </div>
                  ))}
                </div>

                {/* Grid Content */}
                <div className="flex-1 min-w-0 relative">
                  <div className="absolute inset-0 z-0">
                    {timeSlots.map(hour => (
                      <div key={`line-${hour}`} className="h-[120px] border-t border-gray-100"></div>
                    ))}
                  </div>
                  <div className="absolute inset-0 grid z-10" style={{ gridTemplateColumns: `repeat(${members.length}, 1fr)` }}>
                    {members.map(member => (
                      <div key={member.id} className="relative h-full">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 z-0"></div>
                        {todaysPlannedActivities.filter(pa => pa.member_id === member.id).map(pa => (
                          <div key={pa.id} className="absolute ml-10 w-[calc(100%-3rem)] bg-blue-100 border-l-4 border-blue-500 rounded-lg p-2 z-20" style={{top: `${(timeToMinutes(pa.activity.start_time) - (TIMELINE_START_HOUR * 60)) * PIXELS_PER_MINUTE}px`, height: `${(timeToMinutes(pa.activity.end_time) - timeToMinutes(pa.activity.start_time)) * PIXELS_PER_MINUTE}px`}}>
                            <div className="relative z-10 bg-white px-2 py-1 rounded">
                              <p className="text-xs font-bold text-blue-800">{pa.activity.emoji} {pa.activity.name}</p>
                            </div>
                          </div>
                        ))}
                        <AnimatePresence>
                          {(() => {
                            // Compact cards are ~CARD_HEIGHT px tall; chores at the same
                            // (or nearly the same) time cascade below each other instead of overlapping
                            const CARD_HEIGHT = 80;
                            const memberChores = chores
                              .filter(c =>
                                c.assigned_to === member.id &&
                                c.scheduled_time &&
                                !c.is_completed &&
                                (!c.recurring_days || c.recurring_days.length === 0 || c.recurring_days.includes(todayName))
                              )
                              .sort((a, b) => timeToMinutes(a.scheduled_time) - timeToMinutes(b.scheduled_time));
                            let lastBottom = -Infinity;
                            return memberChores.map(chore => {
                              const ideal = (timeToMinutes(chore.scheduled_time) - (TIMELINE_START_HOUR * 60)) * PIXELS_PER_MINUTE;
                              const top = Math.max(ideal, lastBottom);
                              lastBottom = top + CARD_HEIGHT;
                              return (
                                <motion.div key={chore.id} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.5 }} className="absolute ml-10 w-[calc(100%-3rem)] z-30" style={{ top: `${top}px` }}>
                                  <div className="relative z-10 p-2 rounded-lg shadow-md border bg-white border-gray-200">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-3xl leading-none shrink-0">{getChoreEmoji(chore)}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 min-w-0">
                                          <img src={member.photo_url || `https://ui-avatars.com/api/?name=${member.name.charAt(0)}&background=random`} alt={member.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                                          <span className="text-[11px] font-semibold truncate">{chore.name}</span>
                                        </div>
                                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCompleteChore(chore.id, chore.points, chore.assigned_to)} className="w-full mt-1 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-bold flex items-center justify-center gap-1">
                                          <CheckCircle size={12} /> Done!
                                        </motion.button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            });
                          })()}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                  {currentTimePosition > 0 && (
                    <div data-now-line className="absolute w-full h-0.5 bg-red-500 z-30" style={{ top: `${currentTimePosition}px`, left: '0' }}>
                      <div className="absolute -left-1.5 -top-1 w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );

          return (
            <>
              {/* Mobile: single member timeline */}
              <div data-timeline-scroll className="sm:hidden max-h-[70vh] overflow-y-auto overscroll-contain">{renderTimeline(mobileMembers)}</div>
              {/* Desktop: all members */}
              <div data-timeline-scroll className="hidden sm:block max-h-[70vh] overflow-y-auto overscroll-contain">{renderTimeline(desktopMembers)}</div>
            </>
          );
        })()}
      </motion.div>
    </div>
  );
};