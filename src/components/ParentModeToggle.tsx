import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldOff, Lock } from 'lucide-react';

interface ParentModeToggleProps {
  isParentMode: boolean;
  onRequestAuth: () => void;
  onExitParentMode: () => void;
}

export const ParentModeToggle: React.FC<ParentModeToggleProps> = ({
  isParentMode,
  onRequestAuth,
  onExitParentMode
}) => {
  return (
    <div className="flex items-center gap-2">
      {isParentMode ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExitParentMode}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg"
          title="Exit Parent Mode"
        >
          <Shield size={20} />
          <span className="hidden sm:inline">Parent Mode</span>
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRequestAuth}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
          title="Enter Parent Mode"
        >
          <Lock size={20} />
          <span className="hidden sm:inline">Kid Mode</span>
        </motion.button>
      )}
    </div>
  );
};