import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { FamilyMember, ChorePoints } from '../types';
import { EmojiPicker } from './EmojiPicker';

interface AddChoreFormProps {
  familyMembers: FamilyMember[];
  onAddChore: (choreData: {
    name: string;
    assigned_to: string;
    points: number;
    day?: string;
    time_of_day?: 'morning' | 'afternoon' | 'evening';
    emoji?: string;
  }) => Promise<boolean>;
}

export const AddChoreForm: React.FC<AddChoreFormProps> = ({ familyMembers, onAddChore }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    assigned_to: '',
    points: 5 as ChorePoints,
    day: '',
    time_of_day: 'morning' as 'morning' | 'afternoon' | 'evening',
    emoji: '📋'
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeOfDayOptions = [
    { value: 'morning', label: 'Morning ☀️', color: 'text-orange-600' },
    { value: 'afternoon', label: 'Afternoon 🌞', color: 'text-blue-600' },
    { value: 'evening', label: 'Evening 🌜', color: 'text-purple-600' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.assigned_to) return;

    setIsSubmitting(true);
    const success = await onAddChore({
      name: formData.name.trim(),
      assigned_to: formData.assigned_to,
      points: formData.points,
      day: formData.day || undefined,
      time_of_day: formData.time_of_day,
      emoji: formData.emoji
    });

    if (success) {
      setFormData({ 
        name: '', 
        assigned_to: '', 
        points: 5, 
        day: '', 
        time_of_day: 'morning',
        emoji: '📋'
      });
      setIsOpen(false);
    }
    setIsSubmitting(false);
  };

  const getPointsColor = (points: ChorePoints) => {
    switch (points) {
      case 5: return 'border-green-500 bg-green-50 text-green-700';
      case 10: return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      case 20: return 'border-red-500 bg-red-50 text-red-700';
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 z-50"
      >
        <Plus size={28} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add New Chore</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chore Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Take out trash"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chore Icon
                  </label>
                  <EmojiPicker 
                    value={formData.emoji}
                    onChange={(emoji) => setFormData({ ...formData, emoji })}
                    variant="chores"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time of Day
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {timeOfDayOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, time_of_day: option.value as any })}
                        className={`p-3 rounded-xl border-2 text-center font-medium transition-all ${
                          formData.time_of_day === option.value
                            ? `border-current ${option.color} bg-opacity-10`
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-sm font-bold">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to *
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  >
                    <option value="">Select family member</option>
                    {familyMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.avatar} {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points & Difficulty
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 20].map((points) => (
                      <button
                        key={points}
                        type="button"
                        onClick={() => setFormData({ ...formData, points: points as ChorePoints })}
                        className={`p-3 rounded-xl border-2 text-center font-medium transition-all ${
                          formData.points === points
                            ? getPointsColor(points as ChorePoints)
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-lg font-bold">+{points}</div>
                        <div className="text-xs">
                          {points === 5 ? 'Easy' : points === 10 ? 'Medium' : 'Hard'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specific Day (Optional)
                  </label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Any day</option>
                    {days.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim() || !formData.assigned_to}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Plus size={20} />
                        Add Chore
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};