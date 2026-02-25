import React from 'react';
import { motion } from 'framer-motion';

interface TimeSelectorProps {
  selectedTime: 'morning' | 'afternoon' | 'evening';
  onTimeChange: (time: 'morning' | 'afternoon' | 'evening') => void;
}

const timeOptions = [
  { value: 'morning' as const, label: 'Morning', emoji: '☀️', color: 'from-yellow-400 to-orange-400' },
  { value: 'afternoon' as const, label: 'Afternoon', emoji: '🌞', color: 'from-blue-400 to-cyan-400' },
  { value: 'evening' as const, label: 'Evening', emoji: '🌙', color: 'from-purple-400 to-indigo-400' }
];

export const TimeSelector: React.FC<TimeSelectorProps> = ({ selectedTime, onTimeChange }) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 mb-6">
      <div className="grid grid-cols-3 gap-2">
        {timeOptions.map((option) => (
          <motion.button
            key={option.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onTimeChange(option.value)}
            className={`relative p-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              selectedTime === option.value
                ? `bg-gradient-to-r ${option.color} text-white shadow-lg`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">{option.emoji}</span>
              <span className="text-base sm:text-lg font-bold">{option.label}</span>
            </div>
            {selectedTime === option.value && (
              <motion.div
                layoutId="timeSelector"
                className="absolute inset-0 rounded-xl border-4 border-white/30"
                initial={false}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};