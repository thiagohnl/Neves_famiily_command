import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard as Edit, Trash2, MoveHorizontal, ChefHat, Plus, X } from 'lucide-react';
import { MealSlot } from '../lib/mealsApi';

interface PlannedMealPopoverProps {
  date: string;
  currentSlot: MealSlot;
  mealName: string;
  sides?: string[];
  isOpen: boolean;
  onClose: () => void;
  onChangeSlot: (newSlot: MealSlot) => void;
  onRemove: () => void;
  onCooked?: () => void;
  onAddSide?: (side: string) => void;
  onRemoveSide?: (index: number) => void;
  initialView?: 'menu' | 'addSide';
  position?: { top: number; left: number };
}

export const PlannedMealPopover: React.FC<PlannedMealPopoverProps> = ({
  date,
  currentSlot,
  mealName,
  sides = [],
  isOpen,
  onClose,
  onChangeSlot,
  onRemove,
  onCooked,
  onAddSide,
  onRemoveSide,
  initialView = 'menu',
  position,
}) => {
  const [view, setView] = useState<'menu' | 'slots' | 'addSide'>(initialView);
  const [sideText, setSideText] = useState('');

  // Re-sync when the popover is (re)opened for a different cell / entry point
  React.useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setSideText('');
    }
  }, [isOpen, initialView]);

  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];
  const availableSlots = slots.filter(s => s !== currentSlot);

  const submitSide = () => {
    const trimmed = sideText.trim();
    if (trimmed && onAddSide) {
      onAddSide(trimmed);
    }
    setSideText('');
    setView('menu');
  };

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
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[220px] max-w-[280px]"
          >
            <div className="text-xs text-gray-500 px-2 py-1 border-b border-gray-100 mb-1">
              {mealName}{sides.length > 0 ? ` + ${sides.join(', ')}` : ''}
            </div>

            {view === 'menu' && (
              <>
                {onCooked && (
                  <button
                    onClick={() => {
                      onCooked();
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded transition-colors"
                  >
                    <ChefHat size={16} />
                    <span>Cooked It — update pantry</span>
                  </button>
                )}

                <button
                  onClick={() => setView('slots')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  <MoveHorizontal size={16} />
                  <span>Change Slot</span>
                </button>

                {onAddSide && (
                  <button
                    onClick={() => setView('addSide')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Plus size={16} />
                    <span>Add side dish</span>
                  </button>
                )}

                {sides.length > 0 && onRemoveSide && (
                  <div className="px-2 py-1">
                    <div className="text-xs text-gray-500 mb-1">Sides:</div>
                    <div className="flex flex-wrap gap-1">
                      {sides.map((side, i) => (
                        <span key={`${side}-${i}`} className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {side}
                          <button onClick={() => onRemoveSide(i)} className="text-blue-500 hover:text-red-500" aria-label={`Remove ${side}`}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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
            )}

            {view === 'slots' && (
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
                  onClick={() => setView('menu')}
                  className="w-full px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded transition-colors"
                >
                  Back
                </button>
              </div>
            )}

            {view === 'addSide' && (
              <div className="space-y-2 p-1">
                <div className="text-xs text-gray-500 px-1">Add a side dish:</div>
                <input
                  type="text"
                  value={sideText}
                  onChange={(e) => setSideText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitSide(); }}
                  placeholder="e.g. Roast vegetables"
                  autoFocus
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSideText(''); setView('menu'); }}
                    className="flex-1 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 border border-gray-200 rounded-md transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={submitSide}
                    disabled={!sideText.trim()}
                    className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-md transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
