import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { FamilyMember } from '../types';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

interface ScheduleEvent {
  id: string;
  title: string;
  date: string | null;
  start_time: string;
  end_time: string;
  assigned_member_ids: string[];
  is_recurring: boolean;
  recurring_days: string[];
  color: string;
  notes?: string;
}

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
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysEvents();

    const interval = setInterval(() => {
      const now = dayjs();
      if (now.hour() === 0 && now.minute() === 0) {
        fetchTodaysEvents();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchTodaysEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedule_events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const todaysEvents = useMemo(() => {
    const today = dayjs();
    const todayDate = today.format('YYYY-MM-DD');
    const todayName = today.format('dddd');
    const now = dayjs();
    const currentMinutes = timeToMinutes(now.format('HH:mm'));

    const scheduledEvents: Array<ScheduleEvent & { memberId: string; isOngoing: boolean }> = [];

    events.forEach(event => {
      if (event.is_recurring) {
        if (event.recurring_days.includes(todayName)) {
          event.assigned_member_ids.forEach(memberId => {
            const startMinutes = timeToMinutes(event.start_time);
            const endMinutes = timeToMinutes(event.end_time);
            const isOngoing = currentMinutes >= startMinutes && currentMinutes < endMinutes;

            scheduledEvents.push({
              ...event,
              memberId,
              isOngoing,
            });
          });
        }
      } else if (event.date === todayDate) {
        event.assigned_member_ids.forEach(memberId => {
          const startMinutes = timeToMinutes(event.start_time);
          const endMinutes = timeToMinutes(event.end_time);
          const isOngoing = currentMinutes >= startMinutes && currentMinutes < endMinutes;

          scheduledEvents.push({
            ...event,
            memberId,
            isOngoing,
          });
        });
      }
    });

    scheduledEvents.sort((a, b) => {
      const aStart = timeToMinutes(a.start_time);
      const bStart = timeToMinutes(b.start_time);
      return aStart - bStart;
    });

    return scheduledEvents;
  }, [events]);

  const displayEvents = todaysEvents.slice(0, 3);
  const moreCount = Math.max(0, todaysEvents.length - 3);

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
              const timeRange = `${startTime.format('HH:mm')}–${endTime.format('HH:mm')}`;

              return (
                <div
                  key={`${event.id}-${event.memberId}`}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="text-xs text-gray-500 shrink-0 w-20">
                    {timeRange}
                  </span>
                  <span className="font-medium text-gray-900 truncate flex-1">
                    {event.title}
                  </span>
                  <span className="text-xs text-gray-600 truncate flex items-center gap-1 shrink-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                    {member?.name}
                  </span>
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
