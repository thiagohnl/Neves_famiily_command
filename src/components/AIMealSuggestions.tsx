// src/components/AIMealSuggestions.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Plus, Check, Loader2 } from 'lucide-react';
import type { DaySuggestion, MealSuggestion } from '../lib/aiApi';
import type { MealSlot } from '../hooks/useMeals';

interface AIMealSuggestionsProps {
  open: boolean;
  onClose: () => void;
  suggestions: DaySuggestion[] | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  onApplyMeal: (dayIndex: number, slot: MealSlot, meal: MealSuggestion) => void;
  onApplyAll: () => void;
  appliedSlots: Set<string>; // "dayIndex-slot" keys
}

const SLOT_COLORS: Record<MealSlot, { bg: string; border: string; label: string }> = {
  breakfast: { bg: 'bg-sky-50 dark:bg-sky-900/30', border: 'border-sky-200 dark:border-sky-800', label: 'Breakfast' },
  lunch: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800', label: 'Lunch' },
  dinner: { bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800', label: 'Dinner' },
};

export const AIMealSuggestions: React.FC<AIMealSuggestionsProps> = ({
  open,
  onClose,
  suggestions,
  loading,
  error,
  onGenerate,
  onApplyMeal,
  onApplyAll,
  appliedSlots,
}) => {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-500" />
                <h3 className="text-lg font-bold dark:text-white">AI Meal Suggestions</h3>
              </div>
              <div className="flex items-center gap-2">
                {suggestions && suggestions.length > 0 && (
                  <button
                    onClick={onApplyAll}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Check size={14} /> Apply All
                  </button>
                )}
                <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                  <X size={20} className="dark:text-gray-300" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* No suggestions yet — show generate prompt */}
              {!suggestions && !loading && !error && (
                <div className="text-center py-12">
                  <Sparkles size={48} className="mx-auto mb-4 text-purple-400" />
                  <h4 className="text-lg font-semibold dark:text-white mb-2">
                    Let AI plan your week
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Based on your pantry stock, saved meals, and family favorites, Claude will suggest a full week of meals.
                  </p>
                  <button
                    onClick={onGenerate}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-lg"
                  >
                    <Sparkles size={18} /> Generate Suggestions
                  </button>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="text-center py-16">
                  <Loader2 size={40} className="mx-auto mb-4 text-purple-500 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-300 font-medium">Claude is planning your meals...</p>
                  <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">{error}</p>
                  <button
                    onClick={onGenerate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Sparkles size={16} /> Try Again
                  </button>
                </div>
              )}

              {/* Suggestions Grid */}
              {suggestions && suggestions.length > 0 && (
                <div className="space-y-1">
                  {/* Day headers row */}
                  <div className="grid grid-cols-7 gap-3 mb-2">
                    {suggestions.map((day) => (
                      <div key={day.day} className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 py-1">
                        {day.day}
                      </div>
                    ))}
                  </div>

                  {/* One row per meal slot */}
                  {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map((slot) => {
                    const colors = SLOT_COLORS[slot];
                    return (
                      <div key={slot} className="grid grid-cols-7 gap-3 mb-3">
                        {suggestions.map((day, dayIndex) => {
                          const meal = day[slot];
                          if (!meal) return <div key={dayIndex} />;
                          const key = `${dayIndex}-${slot}`;
                          const applied = appliedSlots.has(key);

                          return (
                            <motion.div
                              key={dayIndex}
                              className={`rounded-lg border p-2 flex flex-col ${colors.bg} ${colors.border} ${
                                applied ? 'opacity-60' : ''
                              }`}
                              whileHover={{ scale: applied ? 1 : 1.02 }}
                            >
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                {colors.label}
                              </div>
                              <div className="flex flex-col items-center text-center flex-1">
                                <span className="text-xl">{meal.emoji}</span>
                                <span className="text-xs font-medium dark:text-white mt-0.5 line-clamp-2">
                                  {meal.name}
                                </span>
                                {meal.is_new && (
                                  <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-1.5 py-0.5 rounded-full mt-1 font-medium">
                                    New idea
                                  </span>
                                )}
                                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{meal.reason}</p>
                              </div>
                              {!applied ? (
                                <button
                                  onClick={() => onApplyMeal(dayIndex, slot, meal)}
                                  className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1 text-[10px] bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-700 dark:text-gray-200"
                                >
                                  <Plus size={10} /> Add
                                </button>
                              ) : (
                                <div className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                                  <Check size={10} /> Added
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Regenerate */}
                  <div className="text-center pt-4">
                    <button
                      onClick={onGenerate}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                    >
                      <Sparkles size={14} /> Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
