import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Trophy, Utensils, MapPin, Calendar } from 'lucide-react';
import { FamilyMember, Chore, Activity, PlannedActivity } from '../types';
import { ConfettiCelebration } from './ConfettiCelebration';
import { TodaysScheduleCard } from './TodaysScheduleCard';
import { useTodayMeal } from '../hooks/useMeals';
import { useActivities } from '../hooks/useActivities';
import { useFunIdeas } from '../hooks/useFunIdeas';
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
  return (
    <div className="space-y-1">
      {lunch && <div className="text-sm font-medium text-orange-800">🍽️ Lunch: {lunch.meal_name}</div>}
      {dinner && <div className="text-sm font-medium text-orange-800">🍽️ Dinner: {dinner.meal_name}</div>}
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

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 shadow-sm border border-gray-200 z-10"><div className="flex items-center gap-3 mb-2"><Trophy className="text-purple-600" /><h3 className="font-bold text-purple-800 text-lg">Family Progress</h3></div><div className="grid grid-cols-2 gap-2">{familyMembers.map(m => (<div key={m.id} className="text-center"><img src={m.photo_url || `https://ui-avatars.com/api/?name=${m.name.charAt(0)}&background=random`} alt={m.name} className="w-10 h-10 rounded-full mx-auto object-cover" /><p className="text-xs font-bold">{m.name}</p><p className="text-xs">{m.points} pts</p></div>))}</div></div>
        <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-2xl p-4 shadow-sm border border-gray-200 z-10"><div className="flex items-center gap-3 mb-2"><Utensils className="text-orange-600" /><h3 className="font-bold text-orange-800 text-lg">Meal of the Day</h3></div><TodaysMeals /></div>
        <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl p-4 shadow-sm border border-gray-200 z-10"><div className="flex items-center gap-3 mb-2"><MapPin className="text-green-600" /><h3 className="font-bold text-green-800 text-lg">Today's Fun</h3></div><TodaysFun plannedActivities={todaysPlannedActivities} funIdeasToday={funIdeasToday} /></div>
        <TodaysScheduleCard
          familyMembers={familyMembers}
        />
      </motion.div>

      {/* Timeline */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 z-10">
        <div className="flex items-center gap-3 mb-4"><CheckCircle className="text-blue-500" /><h2 className="text-2xl font-bold text-gray-800">Today's Chores</h2></div>
        
        <div className="flex">
          {/* Time Gutter */}
          <div className="w-16 shrink-0 text-right pr-4">
            <div className="h-16"></div> {/* Header Spacer */}
            {timeSlots.map(hour => (
              <div key={hour} className="h-[120px] -mt-2"><span className="text-sm font-bold text-gray-400">{dayjs().hour(hour).format('ha')}</span></div>
            ))}
          </div>
          
          {/* Main Schedule Area */}
          <div className="flex-1 min-w-0">
            {/* Headers */}
            <div className="relative z-10 bg-white grid" style={{ gridTemplateColumns: `repeat(${familyMembers.length}, 1fr)` }}>
              {familyMembers.map(member => (
                <div key={member.id} className="text-center bg-white px-2 py-2">
                  <img src={member.photo_url || `https://ui-avatars.com/api/?name=${member.name.charAt(0)}&background=random`} alt={member.name} className="w-12 h-12 rounded-full mx-auto object-cover" />
                  <p className="font-bold text-sm mt-2">{member.name}</p>
                </div>
              ))}
            </div>
            
            {/* Grid Content */}
            <div className="relative mt-4">
              {/* Horizontal Lines */}
              <div className="absolute inset-0 z-0">
                {timeSlots.map(hour => (
                  <div key={`line-${hour}`} className="h-[120px] border-t border-gray-100"></div>
                ))}
              </div>
              
              {/* Vertical Lines & Content */}
              <div className="grid relative z-10" style={{ gridTemplateColumns: `repeat(${familyMembers.length}, 1fr)` }}>
                {familyMembers.map(member => (
                  <div key={member.id} className="relative h-full">
                    {/* Vertical line positioned behind content */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 z-0"></div>
                    
                    {/* Activities */}
                    {todaysPlannedActivities.filter(pa => pa.member_id === member.id).map(pa => (
                      <div key={pa.id} className="absolute ml-10 w-[calc(100%-3rem)] bg-blue-100 border-l-4 border-blue-500 rounded-lg p-2 z-20" style={{top: `${(timeToMinutes(pa.activity.start_time) - (TIMELINE_START_HOUR * 60)) * PIXELS_PER_MINUTE}px`, height: `${(timeToMinutes(pa.activity.end_time) - timeToMinutes(pa.activity.start_time)) * PIXELS_PER_MINUTE}px`}}>
                        <div className="relative z-10 bg-white px-2 py-1 rounded">
                          <p className="text-xs font-bold text-blue-800">{pa.activity.emoji} {pa.activity.name}</p>
                        </div>
                      </div>
                    ))}
                    {/* Chores */}
                    {chores.filter(c => c.assigned_to === member.id && c.scheduled_time).map(chore => (
                       <div key={chore.id} className="absolute ml-10 w-[calc(100%-3rem)] z-30" style={{ top: `${(timeToMinutes(chore.scheduled_time) - (TIMELINE_START_HOUR * 60)) * PIXELS_PER_MINUTE - 25}px` }}>
                         <div className={`relative z-10 p-3 rounded-lg shadow-md flex flex-col items-center gap-2 border ${chore.is_completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                           <span className="text-2xl">{chore.emoji}</span>
                           <span className="text-xs text-center font-semibold flex-1">{chore.name}</span>
                           {!chore.is_completed ? (
                              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleCompleteChore(chore.id, chore.points, chore.assigned_to)} className="w-full mt-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-bold flex items-center justify-center gap-1">
                                <CheckCircle size={12} /> Done!
                              </motion.button>
                            ) : (
                              <div className="mt-2 text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle size={12} /> Completed</div>
                            )}
                         </div>
                       </div>
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Current Time Indicator */}
              {currentTimePosition > 0 && (
                <div className="absolute w-full h-0.5 bg-red-500 z-30" style={{ top: `${currentTimePosition}px`, left: '0' }}>
                  <div className="absolute -left-1.5 -top-1 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};