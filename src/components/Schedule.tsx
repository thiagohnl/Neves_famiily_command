import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard as Edit2, Trash2, X, Clock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { FamilyMember } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

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
  created_at: string;
}

const timeToMinutes = (timeStr: string = "00:00") => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const PIXELS_PER_HOUR = 80;
const TIMELINE_START_HOUR = 7;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

interface EventWithLayout {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  displayDate: string;
  memberId: string;
  color: string;
  startMinutes: number;
  endMinutes: number;
  column: number;
  totalColumns: number;
}

const eventsOverlap = (a: EventWithLayout, b: EventWithLayout): boolean => {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
};

const layoutEventsForDay = (events: any[]): EventWithLayout[] => {
  if (events.length === 0) return [];

  // Prepare events with time in minutes
  const prepared = events.map(event => ({
    ...event,
    startMinutes: timeToMinutes(event.start_time || '00:00'),
    endMinutes: Math.min(timeToMinutes(event.end_time || '00:00'), 24 * 60 - 1),
    column: 0,
    totalColumns: 1,
  }));

  // Sort by start time, then by duration (longer first)
  prepared.sort((a, b) => {
    const diff = a.startMinutes - b.startMinutes;
    if (diff !== 0) return diff;
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  // Build clusters of overlapping events
  const clusters: EventWithLayout[][] = [];
  let currentCluster: EventWithLayout[] = [];
  let activeEvents: EventWithLayout[] = [];

  prepared.forEach(event => {
    // Remove events that have ended from active list
    activeEvents = activeEvents.filter(active => active.endMinutes > event.startMinutes);

    if (activeEvents.length === 0 && currentCluster.length > 0) {
      // Start new cluster
      clusters.push(currentCluster);
      currentCluster = [];
    }

    currentCluster.push(event);
    activeEvents.push(event);
  });

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign columns within each cluster
  clusters.forEach(cluster => {
    const columns: EventWithLayout[][] = [];

    cluster.forEach(event => {
      // Find first column where event doesn't overlap with column's last event
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInColumn = columns[i][columns[i].length - 1];
        if (!eventsOverlap(event, lastInColumn)) {
          columns[i].push(event);
          event.column = i;
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Create new column
        columns.push([event]);
        event.column = columns.length - 1;
      }
    });

    // Set total columns for all events in cluster
    const totalColumns = columns.length;
    cluster.forEach(event => {
      event.totalColumns = totalColumns;
    });
  });

  return prepared;
};

const MEMBER_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Green
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple (repeat for more members)
];

const EventModal: React.FC<{
  event: Partial<ScheduleEvent> | null;
  onSave: (data: Partial<ScheduleEvent>) => void;
  onClose: () => void;
  familyMembers: FamilyMember[];
}> = ({ event, onSave, onClose, familyMembers }) => {
  const [formData, setFormData] = useState<Partial<ScheduleEvent>>(
    event || {
      title: '',
      date: dayjs().format('YYYY-MM-DD'),
      start_time: '09:00',
      end_time: '10:00',
      assigned_member_ids: [],
      is_recurring: false,
      recurring_days: [],
      color: MEMBER_COLORS[0],
      notes: '',
    }
  );

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDayToggle = (day: string) => {
    const current = formData.recurring_days || [];
    const newDays = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    setFormData({ ...formData, recurring_days: newDays });
  };

  const handleMemberToggle = (id: string) => {
    const current = formData.assigned_member_ids || [];
    const newIds = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
    setFormData({ ...formData, assigned_member_ids: newIds });
  };

  const handleSubmit = () => {
    if (!formData.title?.trim()) {
      toast.error('Event title is required');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      toast.error('Start and end times are required');
      return;
    }
    if (formData.assigned_member_ids?.length === 0) {
      toast.error('Please assign at least one family member');
      return;
    }
    if (formData.is_recurring && formData.recurring_days?.length === 0) {
      toast.error('Please select recurring days');
      return;
    }
    if (!formData.is_recurring && !formData.date) {
      toast.error('Please select a date for non-recurring events');
      return;
    }
    onSave(formData);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {event?.id ? 'Edit Event' : 'Add New Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Event Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Dentist Appointment, Soccer Practice"
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.start_time || ''}
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.end_time || ''}
                  onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Assign To Family Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign To Family Members *
              </label>
              <div className="flex flex-wrap gap-2">
                {familyMembers.map((member, index) => {
                  const memberColor = MEMBER_COLORS[index % MEMBER_COLORS.length];
                  const isSelected = formData.assigned_member_ids?.includes(member.id);

                  return (
                    <button
                      key={member.id}
                      onClick={() => handleMemberToggle(member.id)}
                      className={`px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium ${
                        isSelected
                          ? 'text-white border-transparent shadow-md'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                      style={isSelected ? { backgroundColor: memberColor, borderColor: memberColor } : {}}
                    >
                      {member.avatar} {member.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recurring Toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_recurring || false}
                  onChange={e => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">This is a recurring event</span>
              </label>
            </div>

            {/* Conditional: Date or Recurring Days */}
            {formData.is_recurring ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recurring Days *
                </label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors font-medium ${
                        formData.recurring_days?.includes(day)
                          ? 'bg-purple-500 text-white border-purple-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Color
              </label>
              <div className="flex flex-wrap gap-2">
                {MEMBER_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      formData.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional details..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
              >
                {event?.id ? 'Update Event' : 'Add Event'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const Schedule: React.FC<{
  familyMembers: FamilyMember[];
  isParentMode: boolean;
}> = ({ familyMembers, isParentMode }) => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent> | null>(null);
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf('week'));
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mobileDayIndex, setMobileDayIndex] = useState(dayjs().day()); // 0=Sun, 6=Sat

  const weekDays = Array.from({ length: 7 }).map((_, i) => currentWeek.add(i, 'day'));
  const timeSlots = Array.from({ length: 15 }, (_, i) => TIMELINE_START_HOUR + i);

  const fetchEvents = async () => {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from('schedule_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setFetchError('Failed to load schedule events');
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentWeek]);

  const allScheduledEventsForWeek = React.useMemo(() => {
    const scheduledEvents: (ScheduleEvent & { displayDate: string; memberId: string })[] = [];

    events.forEach(event => {
      if (event.is_recurring) {
        // Add recurring events for each matching day in the week
        weekDays.forEach(day => {
          const dayName = day.format('dddd');
          if (event.recurring_days.includes(dayName)) {
            event.assigned_member_ids.forEach(memberId => {
              scheduledEvents.push({
                ...event,
                displayDate: day.format('YYYY-MM-DD'),
                memberId,
              });
            });
          }
        });
      } else if (event.date) {
        // Add one-time events
        const eventDay = dayjs(event.date);
        if (eventDay.isBetween(currentWeek, currentWeek.endOf('week'), 'day', '[]')) {
          event.assigned_member_ids.forEach(memberId => {
            scheduledEvents.push({
              ...event,
              displayDate: event.date!,
              memberId,
            });
          });
        }
      }
    });

    return scheduledEvents;
  }, [events, weekDays]);

  const handleSaveEvent = async (eventData: Partial<ScheduleEvent>) => {
    try {
      if (eventData.id) {
        const { error } = await supabase
          .from('schedule_events')
          .update(eventData)
          .eq('id', eventData.id);
        if (error) throw error;
        toast.success('Event updated successfully!');
      } else {
        const { error } = await supabase
          .from('schedule_events')
          .insert(eventData);
        if (error) throw error;
        toast.success('Event added successfully!');
      }
      await fetchEvents();
      setShowEventModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  const handleDeleteEvent = async (event: ScheduleEvent) => {
    if (!confirm(`Are you sure you want to delete "${event.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('schedule_events')
        .delete()
        .eq('id', event.id);
      if (error) throw error;

      await fetchEvents();
      toast.success('Event deleted successfully!');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleEditEvent = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  if (!isParentMode) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-4">🔒</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Parent Access Required</h3>
        <p className="text-gray-600">Only parents can manage the schedule.</p>
      </div>
    );
  }

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (fetchError && events.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">&#x26A0;&#xFE0F;</div>
        <h3 className="text-xl font-bold text-red-600 mb-2">Error Loading Schedule</h3>
        <p className="text-gray-600">{fetchError}</p>
        <button
          onClick={fetchEvents}
          className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header - Sticky */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-[100px] z-40 bg-white border-b border-gray-200 shadow-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mt-3 md:mt-4 mb-3 md:mb-4"
      >
        <div className="page-header bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200 p-4 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentWeek(currentWeek.subtract(1, 'week'))}
                className="p-3 rounded-full hover:bg-white/30 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  {currentWeek.format('MMM D')} - {currentWeek.endOf('week').format('MMM D, YYYY')}
                </h1>
                <p className="text-gray-600">Family Schedule</p>
              </div>
              <button
                onClick={() => setCurrentWeek(currentWeek.add(1, 'week'))}
                className="p-3 rounded-full hover:bg-white/30 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            <button
              onClick={() => {
                setEditingEvent(null);
                setShowEventModal(true);
              }}
              className="btn btn-lg bg-purple-500 hover:bg-purple-600 text-white shadow-lg"
            >
              <Plus size={20} />
              Add Event
            </button>
          </div>
        </div>
      </motion.div>

      {/* --- Desktop: full week grid (hidden on mobile) --- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="hidden sm:block relative h-[calc(100vh-320px)] overflow-auto rounded-2xl border border-gray-200 bg-white shadow-lg"
      >
        <div className="grid auto-rows-[80px]" style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}>
          <div className="sticky top-0 left-0 z-40 bg-white border-b border-r border-gray-200 flex items-center justify-center">
            <Clock size={18} className="text-gray-400" />
          </div>
          {weekDays.map(day => (
            <div
              key={`header-${day.format('YYYY-MM-DD')}`}
              className="sticky top-0 z-30 bg-white border-b border-r border-gray-200 last:border-r-0 flex flex-col items-center justify-center py-3"
            >
              <div className="text-xs font-medium text-gray-500">{day.format('ddd')}</div>
              <div className={`text-lg font-bold ${day.isSame(dayjs(), 'day') ? 'text-purple-600' : 'text-gray-800'}`}>{day.format('D')}</div>
            </div>
          ))}
          {timeSlots.map(hour => (
            <React.Fragment key={hour}>
              <div className="sticky left-0 z-20 bg-white border-r border-b border-gray-200 pr-3 pl-2 text-right text-xs text-gray-500 flex items-start pt-1">
                {dayjs().hour(hour).format('h A')}
              </div>
              {weekDays.map(day => {
                const dayEvents = allScheduledEventsForWeek.filter(event => dayjs(event.displayDate).isSame(day, 'day'));
                const layoutedEvents = layoutEventsForDay(dayEvents);
                return (
                  <div key={`${day.format('YYYY-MM-DD')}-${hour}`} className="relative border-b border-r border-gray-100 last:border-r-0">
                    {hour === TIMELINE_START_HOUR && (
                      <div className="absolute inset-0" style={{ height: `${timeSlots.length * 80}px` }}>
                        {layoutedEvents.map(event => {
                          const displayDuration = Math.max(15, event.endMinutes - event.startMinutes);
                          const topPosition = (event.startMinutes - TIMELINE_START_HOUR * 60) * PIXELS_PER_MINUTE;
                          const height = displayDuration * PIXELS_PER_MINUTE;
                          const member = familyMembers.find(m => m.id === event.memberId);
                          const gap = 4;
                          const widthPercent = 100 / event.totalColumns;
                          const leftPercent = widthPercent * event.column;
                          const width = `calc(${widthPercent}% - ${gap * (event.totalColumns - 1) / event.totalColumns}px)`;
                          const left = `calc(${leftPercent}% + ${gap * event.column}px)`;
                          return (
                            <motion.div
                              key={`${event.id}-${event.displayDate}-${event.memberId}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute rounded-md shadow-sm cursor-pointer hover:shadow-lg hover:z-20 transition-shadow group z-10 max-w-full"
                              style={{ top: `${topPosition}px`, height: `${Math.max(height, 50)}px`, left, width, backgroundColor: event.color }}
                              onClick={() => handleEditEvent(event)}
                            >
                              <div className="text-white p-2 h-full overflow-hidden">
                                <div className="text-xs font-bold truncate">{event.title}</div>
                                <div className="text-[10px] opacity-90 truncate">{member?.avatar} {member?.name}</div>
                                <div className="text-[10px] opacity-75">{event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}</div>
                              </div>
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event); }} className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors">
                                  <Trash2 size={12} className="text-white" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      {/* --- Mobile: single-day view (visible only on mobile) --- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="sm:hidden"
      >
        {/* Day selector */}
        <div className="flex items-center justify-between mb-3 bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
          <button
            onClick={() => setMobileDayIndex(Math.max(0, mobileDayIndex - 1))}
            disabled={mobileDayIndex === 0}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className={`text-lg font-bold ${weekDays[mobileDayIndex]?.isSame(dayjs(), 'day') ? 'text-purple-600' : 'text-gray-800'}`}>
              {weekDays[mobileDayIndex]?.format('dddd')}
            </div>
            <div className="text-sm text-gray-500">{weekDays[mobileDayIndex]?.format('MMM D')}</div>
          </div>
          <button
            onClick={() => setMobileDayIndex(Math.min(6, mobileDayIndex + 1))}
            disabled={mobileDayIndex === 6}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Single-day timeline */}
        <div className="relative h-[calc(100vh-400px)] overflow-auto rounded-2xl border border-gray-200 bg-white shadow-lg">
          <div className="grid auto-rows-[80px]" style={{ gridTemplateColumns: '56px 1fr' }}>
            {/* Header */}
            <div className="sticky top-0 left-0 z-40 bg-white border-b border-r border-gray-200 flex items-center justify-center">
              <Clock size={16} className="text-gray-400" />
            </div>
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center justify-center py-2">
              <span className={`text-base font-bold ${weekDays[mobileDayIndex]?.isSame(dayjs(), 'day') ? 'text-purple-600' : 'text-gray-800'}`}>
                {weekDays[mobileDayIndex]?.format('ddd D')}
              </span>
            </div>

            {/* Hour rows */}
            {timeSlots.map(hour => {
              const mobileDay = weekDays[mobileDayIndex];
              const dayEvents = allScheduledEventsForWeek.filter(event => dayjs(event.displayDate).isSame(mobileDay, 'day'));
              const layoutedEvents = layoutEventsForDay(dayEvents);
              return (
                <React.Fragment key={hour}>
                  <div className="sticky left-0 z-20 bg-white border-r border-b border-gray-200 pr-2 pl-1 text-right text-xs text-gray-500 flex items-start pt-1">
                    {dayjs().hour(hour).format('h A')}
                  </div>
                  <div className="relative border-b border-gray-100">
                    {hour === TIMELINE_START_HOUR && (
                      <div className="absolute inset-0" style={{ height: `${timeSlots.length * 80}px` }}>
                        {layoutedEvents.map(event => {
                          const displayDuration = Math.max(15, event.endMinutes - event.startMinutes);
                          const topPosition = (event.startMinutes - TIMELINE_START_HOUR * 60) * PIXELS_PER_MINUTE;
                          const height = displayDuration * PIXELS_PER_MINUTE;
                          const member = familyMembers.find(m => m.id === event.memberId);
                          const gap = 4;
                          const widthPercent = 100 / event.totalColumns;
                          const leftPercent = widthPercent * event.column;
                          const width = `calc(${widthPercent}% - ${gap * (event.totalColumns - 1) / event.totalColumns}px)`;
                          const left = `calc(${leftPercent}% + ${gap * event.column}px)`;
                          return (
                            <motion.div
                              key={`m-${event.id}-${event.displayDate}-${event.memberId}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute rounded-md shadow-sm cursor-pointer hover:shadow-lg hover:z-20 transition-shadow group z-10 max-w-full"
                              style={{ top: `${topPosition}px`, height: `${Math.max(height, 50)}px`, left, width, backgroundColor: event.color }}
                              onClick={() => handleEditEvent(event)}
                            >
                              <div className="text-white p-2 h-full overflow-hidden">
                                <div className="text-xs font-bold truncate">{event.title}</div>
                                <div className="text-[10px] opacity-90 truncate">{member?.avatar} {member?.name}</div>
                                <div className="text-[10px] opacity-75">{event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}</div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={editingEvent}
          onSave={handleSaveEvent}
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null);
          }}
          familyMembers={familyMembers}
        />
      )}
    </div>
  );
};
