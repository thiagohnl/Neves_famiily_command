import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, X, Save, Calendar, Filter, CheckCircle } from 'lucide-react';
import { FamilyMember, Chore, ChorePoints } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ChoreCalendarProps {
  familyMembers: FamilyMember[];
  chores: Chore[];
  onRefresh: () => Promise<void>;
}

interface DayChore extends Chore {
  assigned_member_name?: string;
  assigned_member_avatar?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  chores: DayChore[];
}

export const ChoreCalendar: React.FC<ChoreCalendarProps> = ({
  familyMembers,
  chores,
  onRefresh
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [editingChore, setEditingChore] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [newChore, setNewChore] = useState({
    name: '',
    assigned_to: '',
    points: 5 as ChorePoints,
    time_of_day: 'morning' as 'morning' | 'afternoon' | 'evening',
    emoji: '📋',
    recurring: false
  });

  const [editChore, setEditChore] = useState({
    name: '',
    assigned_to: '',
    points: 5 as ChorePoints,
    time_of_day: 'morning' as 'morning' | 'afternoon' | 'evening',
    emoji: '📋'
  });

  const commonEmojis = ['📋', '🗑️', '🍽️', '🛏️', '🧸', '🧹', '🐕', '🌱', '📚', '🎒', '🧺', '🚗'];

  const getChoresForDate = (date: Date): DayChore[] => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    let dayChores = chores
      .filter(chore => {
        // Match specific day or no day specified (daily chores)
        return chore.day === dayName || !chore.day;
      })
      .map(chore => {
        const member = familyMembers.find(m => m.id === chore.assigned_to);
        return {
          ...chore,
          assigned_member_name: member?.name || 'Unknown',
          assigned_member_avatar: member?.avatar || '👤'
        };
      });
    
    // Apply member filter if selected
    if (selectedMemberFilter !== 'all') {
      dayChores = dayChores.filter(chore => chore.assigned_to === selectedMemberFilter);
    }
    
    return dayChores;
  };

  const getDayStatus = (chores: DayChore[]) => {
    if (chores.length === 0) return { color: 'bg-gray-200', count: 0, allDone: false };
    
    const completedChores = chores.filter(chore => chore.is_completed).length;
    const totalChores = chores.length;
    
    if (completedChores === totalChores) {
      return { color: 'bg-green-500', count: totalChores, allDone: true };
    } else if (completedChores > 0) {
      return { color: 'bg-yellow-500', count: totalChores, allDone: false };
    } else {
      return { color: 'bg-red-500', count: totalChores, allDone: false };
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days: CalendarDay[] = [];
    
    // Add previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dayChores = getChoresForDate(date);
      days.push({ date, isCurrentMonth: false, chores: dayChores });
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayChores = getChoresForDate(date);
      days.push({ date, isCurrentMonth: true, chores: dayChores });
    }
    
    // Add next month's leading days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dayChores = getChoresForDate(date);
      days.push({ date, isCurrentMonth: false, chores: dayChores });
    }
    
    return days;
  }, [currentDate, chores, familyMembers, selectedMemberFilter]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day);
    setShowDayModal(true);
    setShowAddForm(false);
    setEditingChore(null);
  };

  const handleCompleteChore = async (choreId: string, points: number, assignedTo: string) => {
    setIsLoading(true);
    try {
      // Get current member points and update in sequence
      const { data: memberData, error: fetchError } = await supabase
        .from('family_members')
        .select('points')
        .eq('id', assignedTo)
        .single();

      if (fetchError) throw fetchError;

      // Mark chore as completed
      const { error: choreError } = await supabase
        .from('chores')
        .update({ 
          is_completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', choreId);

      if (choreError) throw choreError;

      // Update member points
      const newPoints = (memberData?.points || 0) + points;
      const { error: memberError } = await supabase
        .from('family_members')
        .update({ points: newPoints })
        .eq('id', assignedTo);

      if (memberError) throw memberError;

      // Force refresh to sync all data including points
      await onRefresh();
      
      toast.success('Chore completed! 🎉', {
        icon: '✅',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error completing chore:', error);
      toast.error('Failed to complete chore', {
        icon: '❌',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChore = async () => {
    if (!newChore.name.trim() || !newChore.assigned_to || !selectedDay) return;

    setIsLoading(true);
    setErrors({});
    
    try {
      // Validate required fields
      if (!newChore.name.trim()) {
        throw new Error('Chore name is required');
      }
      if (!newChore.assigned_to) {
        throw new Error('Please select a family member');
      }
      if (!newChore.points || newChore.points < 1) {
        throw new Error('Points must be greater than 0');
      }

      const dayName = selectedDay.date.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Prepare data with proper column mapping
      const choreToInsert = {
        name: newChore.name.trim(),
        assigned_to: newChore.assigned_to,
        points: newChore.points,
        time_of_day: newChore.time_of_day,
        emoji: newChore.emoji || '📋',
        day: dayName,
        is_completed: false
      };

      const { error } = await supabase
        .from('chores')
        .insert([choreToInsert]);

      if (error) throw error;

      await onRefresh();
      setNewChore({
        name: '',
        assigned_to: '',
        points: 5,
        time_of_day: 'morning',
        emoji: '📋',
        recurring: false
      });
      setShowAddForm(false);
      
      toast.success('Chore added successfully!', {
        icon: '✅',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error adding chore:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add chore';
      toast.error(errorMessage, {
        icon: '❌',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditChore = async (choreId: string) => {
    if (!editChore.name.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('chores')
        .update({
          name: editChore.name.trim(),
          assigned_to: editChore.assigned_to,
          points: editChore.points,
          time_of_day: editChore.time_of_day,
          emoji: editChore.emoji
        })
        .eq('id', choreId);

      if (error) throw error;

      await onRefresh();
      setEditingChore(null);
      
      toast.success('Chore updated successfully!', {
        icon: '✅',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error updating chore:', error);
      toast.error('Failed to update chore', {
        icon: '❌',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChore = async (choreId: string, choreName: string) => {
    if (!confirm(`Are you sure you want to delete "${choreName}"?`)) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', choreId);

      if (error) throw error;

      await onRefresh();
      
      toast.success('Chore deleted successfully!', {
        icon: '🗑️',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error deleting chore:', error);
      toast.error('Failed to delete chore', {
        icon: '❌',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (chore: DayChore) => {
    setEditingChore(chore.id);
    setEditChore({
      name: chore.name,
      assigned_to: chore.assigned_to,
      points: chore.points,
      time_of_day: chore.time_of_day || 'morning',
      emoji: chore.emoji || '📋'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const groupChoresByMember = (chores: DayChore[]) => {
    const grouped = chores.reduce((acc, chore) => {
      const memberId = chore.assigned_to;
      if (!acc[memberId]) {
        acc[memberId] = {
          member: familyMembers.find(m => m.id === memberId),
          chores: []
        };
      }
      acc[memberId].chores.push(chore);
      return acc;
    }, {} as Record<string, { member?: FamilyMember; chores: DayChore[] }>);
    
    return Object.values(grouped).filter(group => group.member);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100"
    >
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="text-purple-500" size={32} />
        <h2 className="text-3xl font-bold text-gray-800">Chore Calendar</h2>
      </div>

      {/* Member Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="text-gray-500" size={20} />
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
        </div>
        <select
          value={selectedMemberFilter}
          onChange={(e) => setSelectedMemberFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
        >
          <option value="all">All Family Members</option>
          {familyMembers.map(member => (
            <option key={member.id} value={member.id}>
              {member.avatar} {member.name}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        
        <h3 className="text-2xl font-bold text-gray-800">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {/* Day headers */}
        {dayNames.map(day => (
          <div key={day} className="text-center py-3 text-sm font-bold text-gray-600">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const dayStatus = getDayStatus(day.chores);
          
          return (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDayClick(day)}
              className={`
                relative p-4 min-h-[70px] rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center
                ${day.isCurrentMonth 
                  ? 'border-gray-200 hover:border-purple-300 bg-white' 
                  : 'border-gray-100 bg-gray-50 text-gray-400'
                }
                ${isToday(day.date) ? 'border-purple-500 bg-purple-50' : ''}
              `}
            >
              {/* Day Number */}
              <div className={`text-lg font-bold mb-2 ${
                isToday(day.date) ? 'text-purple-600' : 
                day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
              }`}>
                {day.date.getDate()}
              </div>
              
              {/* Chore Status Badge */}
              {dayStatus.count > 0 && (
                <div className={`${dayStatus.color} text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1`}>
                  {dayStatus.allDone && <CheckCircle size={12} />}
                  {dayStatus.count}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Day Detail Modal */}
      <AnimatePresence>
        {showDayModal && selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDayModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedDay.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <button
                  onClick={() => setShowDayModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Add Chore Button */}
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full mb-6 bg-purple-500 text-white px-4 py-3 rounded-xl hover:bg-purple-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Chore for This Day
              </button>

              {/* Add Chore Form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-50 rounded-xl p-4 mb-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Chore Name *
                        </label>
                        <input
                          type="text"
                          value={newChore.name}
                          onChange={(e) => setNewChore({ ...newChore, name: e.target.value })}
                          placeholder="e.g., Take out trash"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign to *
                        </label>
                        <select
                          value={newChore.assigned_to}
                          onChange={(e) => setNewChore({ ...newChore, assigned_to: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                          <option value="">Select member</option>
                          {familyMembers.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.avatar} {member.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Points
                        </label>
                        <select
                          value={newChore.points}
                          onChange={(e) => setNewChore({ ...newChore, points: Number(e.target.value) as ChorePoints })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                          <option value={5}>5 points (Easy)</option>
                          <option value={10}>10 points (Medium)</option>
                          <option value={20}>20 points (Hard)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time of Day
                        </label>
                        <select
                          value={newChore.time_of_day}
                          onChange={(e) => setNewChore({ ...newChore, time_of_day: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                          <option value="morning">Morning ☀️</option>
                          <option value="afternoon">Afternoon 🌞</option>
                          <option value="evening">Evening 🌜</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emoji
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newChore.emoji}
                          onChange={(e) => setNewChore({ ...newChore, emoji: e.target.value })}
                          className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-center text-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                        <div className="flex flex-wrap gap-1">
                          {commonEmojis.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setNewChore({ ...newChore, emoji })}
                              className="w-8 h-8 text-lg hover:bg-gray-200 rounded transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddChore}
                        disabled={isLoading || !newChore.name.trim() || !newChore.assigned_to}
                        className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Plus size={16} />
                            Add Chore
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chores Grouped by Family Member */}
              <div className="space-y-4">
                {selectedDay.chores.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📅</div>
                    <p className="text-gray-600">No chores scheduled for this day</p>
                  </div>
                ) : (
                  groupChoresByMember(selectedDay.chores).map(({ member, chores }) => (
                    <div key={member!.id} className="bg-gray-50 rounded-xl p-6">
                      {/* Member Header */}
                      <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-200">
                        <div className="flex-shrink-0">
                          {member!.photo_url ? (
                            <img
                              src={member!.photo_url}
                              alt={member!.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="text-3xl">{member!.avatar}</div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-800">{member!.name}</h4>
                          <p className="text-sm text-gray-600">
                            {chores.filter(c => c.is_completed).length} of {chores.length} completed
                          </p>
                        </div>
                      </div>
                      
                      {/* Member's Chores */}
                      <div className="space-y-3">
                        {chores.map(chore => (
                          <div key={chore.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            {editingChore === chore.id ? (
                              // Edit mode
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <input
                                    type="text"
                                    value={editChore.name}
                                    onChange={(e) => setEditChore({ ...editChore, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                  />
                                </div>
                                <div>
                                  <select
                                    value={editChore.assigned_to}
                                    onChange={(e) => setEditChore({ ...editChore, assigned_to: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                  >
                                    {familyMembers.map(member => (
                                      <option key={member.id} value={member.id}>
                                        {member.avatar} {member.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="sm:col-span-2 flex gap-2">
                                  <button
                                    onClick={() => setEditingChore(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleEditChore(chore.id)}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                                  >
                                    <Save size={16} />
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="text-4xl">{chore.emoji || '📋'}</div>
                                  <div className="flex-1">
                                    <h5 className="text-lg font-bold text-gray-800 mb-1">{chore.name}</h5>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                        +{chore.points} points
                                      </span>
                                      <span className="capitalize">{chore.time_of_day}</span>
                                      {chore.is_completed && (
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                          <CheckCircle size={12} />
                                          Completed
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {!chore.is_completed && (
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => handleCompleteChore(chore.id, chore.points, chore.assigned_to)}
                                      disabled={isLoading}
                                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
                                    >
                                      {isLoading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      ) : (
                                        <>
                                          <CheckCircle size={16} />
                                          Done
                                        </>
                                      )}
                                    </motion.button>
                                  )}
                                  <button
                                    onClick={() => startEdit(chore)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteChore(chore.id, chore.name)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};