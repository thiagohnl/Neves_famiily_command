import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Chore, ChoreColor } from '../types';

interface ChoreCardProps {
  chore: Chore;
  onComplete: (choreId: string, points: number, assignedTo: string) => Promise<boolean>;
}

export const ChoreCard: React.FC<ChoreCardProps> = ({ chore, onComplete }) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const getColorClasses = (points: number): { bg: string; border: string; text: string } => {
    switch (points) {
      case 5:
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800'
        };
      case 10:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800'
        };
      case 20:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800'
        };
    }
  };

  const getPointsBadgeColor = (points: number): string => {
    switch (points) {
      case 5: return 'bg-green-500';
      case 10: return 'bg-yellow-500';
      case 20: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    const success = await onComplete(chore.id, chore.points, chore.assigned_to);
    if (!success) {
      setIsCompleting(false);
    }
  };

  const colorClasses = getColorClasses(chore.points);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`${colorClasses.bg} ${colorClasses.border} border-2 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${colorClasses.text} mb-1`}>
            {chore.name}
          </h3>
          <p className="text-sm text-gray-600">
            Assigned to: <span className="font-medium">{chore.assigned_member_name}</span>
          </p>
          {chore.day && (
            <p className="text-sm text-gray-500 mt-1">
              📅 {chore.day}
            </p>
          )}
        </div>
        
        <div className={`${getPointsBadgeColor(chore.points)} text-white px-3 py-1 rounded-full text-sm font-bold`}>
          +{chore.points}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleComplete}
        disabled={isCompleting}
        className="w-full bg-white border-2 border-current rounded-xl py-4 px-6 font-bold text-lg flex items-center justify-center gap-3 hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ 
          color: chore.points === 5 ? '#059669' : chore.points === 10 ? '#D97706' : '#DC2626' 
        }}
      >
        {isCompleting ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
        ) : (
          <>
            <CheckCircle size={24} />
            Done!
          </>
        )}
      </motion.button>
    </motion.div>
  );
};