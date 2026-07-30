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
  return isParentMode ? (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onExitParentMode}
      className="p-2 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-md transition-colors"
      title="Exit Parent Mode"
      aria-label="Exit Parent Mode"
    >
      <Shield size={18} />
    </motion.button>
  ) : (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onRequestAuth}
      className="p-2 hover:bg-gray-100 rounded-md transition-colors"
      title="Enter Parent Mode"
      aria-label="Enter Parent Mode"
    >
      <Lock size={18} />
    </motion.button>
  );
};