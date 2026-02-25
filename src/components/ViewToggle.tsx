import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, BarChart3 } from 'lucide-react';

interface ViewToggleProps {
  currentView: 'board' | 'dashboard';
  onViewChange: (view: 'board' | 'dashboard') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-100">
      <div className="flex gap-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onViewChange('board')}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
            currentView === 'board'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <LayoutGrid size={24} />
          <span className="hidden sm:inline">📋 Board</span>
          <span className="sm:hidden">📋</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onViewChange('dashboard')}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
            currentView === 'dashboard'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BarChart3 size={24} />
          <span className="hidden sm:inline">📊 Dashboard</span>
          <span className="sm:hidden">📊</span>
        </motion.button>
      </div>
    </div>
  );
};