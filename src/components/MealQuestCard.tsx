import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Check } from 'lucide-react';

interface MealQuestCardProps {
  challenge: {
    title: string;
    description: string;
    target: number;
    current: number;
    completed: boolean;
  } | null;
  loading?: boolean;
  isParentMode?: boolean;
}

export const MealQuestCard: React.FC<MealQuestCardProps> = ({
  challenge,
  loading = false,
  isParentMode = false
}) => {
  if (loading) {
    return (
      <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!challenge) return null;

  const progress = Math.min((challenge.current / challenge.target) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border shadow-sm p-4 ${
        challenge.completed
          ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
          : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy
            size={20}
            className={challenge.completed ? 'text-amber-500' : 'text-blue-500'}
          />
          <div>
            <h3 className="font-bold text-gray-800 text-sm">
              Meal Quest: {challenge.title}
            </h3>
            <p className="text-xs text-gray-600">{challenge.description}</p>
          </div>
        </div>

        {challenge.completed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500"
          >
            <Check size={18} className="text-white" />
          </motion.div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">
            {isParentMode ? (
              <>Progress: {challenge.current} / {challenge.target}</>
            ) : (
              challenge.completed ? 'Completed!' : 'In Progress'
            )}
          </span>
          {isParentMode && !challenge.completed && (
            <span className="text-gray-500">{Math.round(progress)}%</span>
          )}
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              challenge.completed
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400'
                : 'bg-gradient-to-r from-blue-400 to-purple-400'
            }`}
          />
        </div>
      </div>

      {challenge.completed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-amber-200"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-700 font-semibold">👨‍🍳 Chef of the Week earned!</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
