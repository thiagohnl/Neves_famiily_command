import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FamilyMember, Chore } from '../types';
import { ConfettiCelebration } from './ConfettiCelebration';

interface ChoreBoardProps {
  familyMembers: FamilyMember[];
  chores: Chore[];
  selectedTime: 'morning' | 'afternoon' | 'evening';
  onCompleteChore: (choreId: string, points: number, assignedTo: string) => Promise<boolean>;
}

export const ChoreBoard: React.FC<ChoreBoardProps> = ({
  familyMembers,
  chores,
  selectedTime,
  onCompleteChore
}) => {
  const [completingChores, setCompletingChores] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);

  const getChoresForMember = (memberId: string) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return chores.filter(chore => 
      chore.assigned_to === memberId && 
      chore.time_of_day === selectedTime &&
      (!chore.day || chore.day === today) &&
      !chore.is_completed
    );
  };

  const handleCompleteChore = async (choreId: string, points: number, assignedTo: string) => {
    setCompletingChores(prev => new Set(prev).add(choreId));
    
    const success = await onCompleteChore(choreId, points, assignedTo);
    
    if (success) {
      setShowConfetti(true);
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

  const getPointsColor = (points: number) => {
    switch (points) {
      case 5: return 'bg-green-500';
      case 10: return 'bg-yellow-500';
      case 20: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
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
    <div className="space-y-6">
      <ConfettiCelebration 
        show={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />

      {/* Swimlane Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {familyMembers.map((member) => {
          const memberChores = getChoresForMember(member.id);
          
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100 min-h-[400px]"
            >
              {/* Member Header */}
              <div className="text-center mb-6 pb-4 border-b border-gray-100">
                <div className="mb-3">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 mx-auto"
                    />
                  ) : (
                    <div className="text-6xl">{member.avatar}</div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{member.name}</h2>
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-lg font-bold">
                  {member.points} points
                </div>
              </div>

              {/* Chores for Selected Time */}
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {memberChores.map((chore) => (
                    <motion.div
                      key={chore.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
                    >
                      {/* Chore Content */}
                      <div className="text-center mb-4">
                        <div className="text-5xl mb-3">{chore.emoji || '📋'}</div>
                        <h4 className="text-lg font-bold text-gray-800 mb-2">
                          {chore.name}
                        </h4>
                        <div className={`${getPointsColor(chore.points)} text-white px-3 py-1 rounded-full text-sm font-bold inline-block`}>
                          +{chore.points} points
                        </div>
                      </div>

                      {/* Done Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCompleteChore(chore.id, chore.points, chore.assigned_to)}
                        disabled={completingChores.has(chore.id)}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl py-4 px-6 font-bold text-xl flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* No Chores Message */}
                {memberChores.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-lg text-gray-600">All done for now!</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};