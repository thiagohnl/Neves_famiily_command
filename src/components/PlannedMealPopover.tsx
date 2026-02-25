import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard as Edit, Trash2, MoveHorizontal } from 'lucide-react';
import { MealSlot } from '../lib/mealsApi';

interface PlannedMealPopoverProps {
  date: string;
  currentSlot: MealSlot;
  mealName: string;
  isOpen: boolean;
  onClose: () => void;
  onChangeSlot: (newSlot: MealSlot) => void;
  onRemove: () => void;
  position?: { top: number; left: number };
}

export const PlannedMealPopover: React.FC<PlannedMealPopoverProps> = ({
  date,
  currentSlot,
  mealName,
  isOpen,
  onClose,
  onChangeSlot,
  onRemove,
  position,
}) => {
  const [showSlotSelector, setShowSlotSelector] = useState(false);

  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];
  const availableSlots = slots.filter(s => s !== currentSlot);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={position ? { top: position.top, left: position.left } : {}}
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px]"
          >
            <div className="text-xs text-gray-500 px-2 py-1 border-b border-gray-100 mb-1">
              {mealName}
            </div>

            {!showSlotSelector ? (
              <>
                <button
                  onClick={() => setShowSlotSelector(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  <MoveHorizontal size={16} />
                  <span>Change Slot</span>
                </button>

                <button
                  onClick={() => {
                    onRemove();
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Remove</span>
                </button>
              </>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 px-2 py-1">Move to:</div>
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => {
                      onChangeSlot(slot);
                      onClose();
                    }}
                    className="w-full px-3 py-2 text-sm text-left capitalize hover:bg-blue-50 rounded transition-colors"
                  >
                    {slot}
                  </button>
                ))}
                <button
                  onClick={() => setShowSlotSelector(false)}
                  className="w-full px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded transition-colors"
                >
                  Back
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
