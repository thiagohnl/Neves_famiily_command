import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, StarOff } from 'lucide-react';
import { FamilyMember, Chore } from '../types';
import { ConfettiCelebration } from './ConfettiCelebration';

interface UnifiedChoreBoardProps {
  familyMembers: FamilyMember[];
  chores: Chore[];
  onCompleteChore: (choreId: string, points: number, assignedTo: string) => Promise<boolean>;
}

interface TimeOfDaySection {
  key: 'morning' | 'afternoon' | 'evening';
  label: string;
  emoji: string;
  bgColor: string;
  textColor: string;
}

const timeOfDaySections: TimeOfDaySection[] = [
  {
    key: 'morning',
    label: 'Morning',
    emoji: '☀️',
    bgColor: 'bg-gradient-to-r from-yellow-100 to-orange-100',
    textColor: 'text-orange-800'
  },
  {
    key: 'afternoon',
    label: 'Afternoon', 
    emoji: '🌞',
    bgColor: 'bg-gradient-to-r from-blue-100 to-cyan-100',
    textColor: 'text-blue-800'
  },
  {
    key: 'evening',
    label: 'Evening',
    emoji: '🌜',
    bgColor: 'bg-gradient-to-r from-purple-100 to-indigo-100',
    textColor: 'text-purple-800'
  }
];

export const UnifiedChoreBoard: React.FC<UnifiedChoreBoardProps> = ({
  familyMembers,
  chores,
  onCompleteChore
}) => {
  const [completingChores, setCompletingChores] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);

  const getTodayChores = (memberId: string) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return chores.filter(chore => 
      chore.assigned_to === memberId && 
      (!chore.day || chore.day === today)
    );
  };

  const getChoresByTimeOfDay = (memberChores: Chore[], timeOfDay: 'morning' | 'afternoon' | 'evening') => {
    return memberChores.filter(chore => chore.time_of_day === timeOfDay);
  };

  const calculateDailyProgress = (memberChores: Chore[]) => {
    const totalChores = memberChores.length;
    const completedChores = memberChores.filter(chore => chore.is_completed).length;
    return { completed: completedChores, total: totalChores };
  };

  const handleCompleteChore = async (choreId: string, points: number, assignedTo: string) => {
    setCompletingChores(prev => new Set(prev).add(choreId));
    
    const success = await onCompleteChore(choreId, points, assignedTo);
    
    if (success) {
      setShowConfetti(true);
      // Remove from completing set after animation
      setTimeout(() => {
        setCompletingChores(prev => {
          const newSet = new Set(prev);
          newSet.delete(choreId);
          return newSet;
        });
      }, 1000);
    } else {
      setCompletingChores(prev => {
        const newSet = new Set(prev);
        newSet.delete(choreId);
        return newSet;
      });
    }
    
    return success;
  };

  const renderStars = (completed: number, total: number) => {
    const maxStars = 5;
    const filledStars = Math.min(maxStars, Math.round((completed / Math.max(total, 1)) * maxStars));
    
    return (
      <div className="flex gap-1">
        {Array.from({ length: maxStars }, (_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            {i < filledStars ? (
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            ) : (
              <StarOff className="w-6 h-6 text-gray-300" />
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  if (familyMembers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-4">👨‍👩‍👧‍👦</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">No family members yet</h3>
        <p className="text-gray-600">Add family members to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConfettiCelebration 
        show={showConfetti} 
        onComplete={() => setShowConfetti(false)}
        message="Awesome work! Keep it up! 🌟"
      />

      {familyMembers.map((member) => {
        const memberChores = getTodayChores(member.id);
        const progress = calculateDailyProgress(memberChores);
        
        return (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100"
          >
            {/* Member Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="text-6xl">{member.avatar}</div>
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">{member.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-lg font-medium text-blue-600">
                      {member.points} points
                    </span>
                    <div className="flex items-center gap-2">
                      {renderStars(progress.completed, progress.total)}
                      <span className="text-sm text-gray-500 ml-2">
                        {progress.completed}/{progress.total} today
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time of Day Sections */}
            <div className="space-y-6">
              {timeOfDaySections.map((section) => {
                const sectionChores = getChoresByTimeOfDay(memberChores, section.key);
                
                if (sectionChores.length === 0) return null;

                return (
                  <div key={section.key} className={`${section.bgColor} rounded-2xl p-4`}>
                    <h3 className={`text-xl font-bold ${section.textColor} mb-4 flex items-center gap-2`}>
                      <span className="text-2xl">{section.emoji}</span>
                      {section.label}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence mode="popLayout">
                        {sectionChores.map((chore) => (
                          <motion.div
                            key={chore.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className={`bg-white rounded-2xl p-4 shadow-md border-2 ${
                              chore.is_completed 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            } transition-all duration-200`}
                          >
                            {/* Chore Content */}
                            <div className="text-center mb-4">
                              <div className="text-4xl mb-2">{chore.emoji || '📋'}</div>
                              <h4 className="text-lg font-bold text-gray-800 mb-1">
                                {chore.name}
                              </h4>
                              <div className="flex items-center justify-center gap-2">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                                  +{chore.points} points
                                </span>
                              </div>
                            </div>

                            {/* Action Button */}
                            {chore.is_completed ? (
                              <div className="bg-green-500 text-white rounded-xl py-4 px-6 text-center font-bold text-lg flex items-center justify-center gap-2">
                                <span className="text-2xl">✅</span>
                                Completed!
                              </div>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleCompleteChore(chore.id, chore.points, chore.assigned_to)}
                                disabled={completingChores.has(chore.id)}
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl py-4 px-6 font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                              >
                                {completingChores.has(chore.id) ? (
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                ) : (
                                  <>
                                    <span className="text-2xl">✅</span>
                                    Done!
                                  </>
                                )}
                              </motion.button>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* No Chores Message */}
            {memberChores.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-lg text-gray-600">No chores for today!</p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};