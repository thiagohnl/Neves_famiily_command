import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { FamilyMember } from '../types';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import dayjs from 'dayjs';
import { useBoardRefresh } from '../hooks/useBoardRefresh';
import { ScheduleEvent, useScheduleEvents } from '../hooks/useScheduleEvents';

interface TodaysScheduleCardProps {
  familyMembers: FamilyMember[];
}

const timeToMinutes = (timeStr: string = "00:00") => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const TodaysScheduleCard: React.FC<TodaysScheduleCardProps> = ({
  familyMembers,
}) => {
  const { today } = useBoardRefresh();
  const { todaysEvents: dayEvents, loading } = useScheduleEvents(today);
  const { events: googleEvents } = useGoogleCalendar(today, today);

  const todaysEvents = useMemo(() => {
    const todayDate = today;
    const now = dayjs();
    const currentMinutes = timeToMinutes(now.format('HH:mm'));

    const scheduledEvents: Array<
      Pick<ScheduleEvent, 'id' | 'title' | 'start_time' | 'end_time' | 'color'> & {
        memberId: string;
        isOngoing: boolean;
        isPast?: boolean;
        isGoogle?: boolean;
        allDay?: boolean;
      }
    > = [];

    dayEvents.forEach(event => {
      event.assigned_member_ids.forEach(memberId => {
        const startMinutes = timeToMinutes(event.start_time);
        const endMinutes = timeToMinutes(event.end_time);
        scheduledEvents.push({
          ...event,
          memberId,
          isOngoing: currentMinutes >= startMinutes && currentMinutes < endMinutes,
          isPast: currentMinutes >= endMinutes,
        });
      });
    });

    // Read-only Google Calendar events for today
    googleEvents
      .filter(e => e.displayDate === todayDate)
      .forEach(e => {
        const startMinutes = timeToMinutes(e.start_time);
        const endMinutes = timeToMinutes(e.end_time);
        scheduledEvents.push({
          id: e.id,
          title: e.title,
          start_time: e.start_time,
          end_time: e.end_time,
          color: '#4285F4',
          memberId: '__google__',
          isOngoing: !e.allDay && currentMinutes >= startMinutes && currentMinutes < endMinutes,
          isPast: !e.allDay && currentMinutes >= endMinutes,
          isGoogle: true,
          allDay: e.allDay,
        });
      });

    scheduledEvents.sort((a, b) => {
      if (!!a.allDay !== !!b.allDay) return a.allDay ? -1 : 1; // all-day first
      const aStart = timeToMinutes(a.start_time);
      const bStart = timeToMinutes(b.start_time);
      return aStart - bStart;
    });

    return scheduledEvents;
  }, [dayEvents, googleEvents, today]);

  const displayEvents = todaysEvents.slice(0, 5);
  const moreCount = Math.max(0, todaysEvents.length - 5);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5 z-10"
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={18} className="text-blue-500" />
          <h3 className="text-base font-bold text-gray-800">Today's Schedule</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-start gap-3">
              <div className="h-3 w-16 bg-gray-200 rounded"></div>
              <div className="flex-1 h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5 z-10"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={18} className="text-blue-500" />
        <h3 className="text-base font-bold text-gray-800">Today's Schedule</h3>
      </div>

      {todaysEvents.length === 0 ? (
        <p className="text-sm text-gray-500">No events today.</p>
      ) : (
        <>
          <div className="space-y-2">
            {displayEvents.map((event) => {
              const member = familyMembers.find(m => m.id === event.memberId);
              const startTime = dayjs().startOf('day').add(timeToMinutes(event.start_time), 'minute');
              const endTime = dayjs().startOf('day').add(timeToMinutes(event.end_time), 'minute');
              const timeRange = event.allDay
                ? 'All day'
                : `${startTime.format('HH:mm')}–${endTime.format('HH:mm')}`;

              return (
                <div
                  key={`${event.id}-${event.memberId}`}
                  className={`flex items-center gap-3 text-sm rounded-lg -mx-2 px-2 py-0.5 ${
                    event.isOngoing ? 'bg-blue-50' : ''
                  } ${event.isPast ? 'opacity-40' : ''}`}
                >
                  <span
                    className={`text-xs shrink-0 w-20 ${
                      event.isOngoing ? 'text-blue-600 font-semibold' : 'text-gray-500'
                    }`}
                  >
                    {timeRange}
                  </span>
                  <span className="font-medium text-gray-900 truncate flex-1">
                    {event.title}
                  </span>
                  {member && (
                    <span className="text-xs text-gray-600 truncate flex items-center gap-1 shrink-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      {member.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {moreCount > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              +{moreCount} more today
            </p>
          )}
        </>
      )}
    </motion.div>
  );
};
