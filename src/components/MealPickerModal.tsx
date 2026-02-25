import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Heart } from 'lucide-react';
import type { MealSlot } from '@/lib/mealsApi';

interface MealPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  slot: MealSlot;
  dateLabel: string;
  savedMeals: any[];
  freezerItems: any[];
  isFavorite: (id: string) => boolean;
  onSelect: (meal: { id: string | null; name: string; emoji: string | null }, type: 'saved-meal' | 'freezer') => void;
}

const slotColors: Record<string, { bg: string; border: string; label: string }> = {
  breakfast: { bg: 'bg-sky-50', border: 'border-sky-200', label: 'Breakfast' },
  lunch: { bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Lunch' },
  dinner: { bg: 'bg-orange-50', border: 'border-orange-200', label: 'Dinner' },
};

export const MealPickerModal: React.FC<MealPickerModalProps> = ({
  isOpen,
  onClose,
  date,
  slot,
  dateLabel,
  savedMeals,
  freezerItems,
  isFavorite,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'saved' | 'freezer'>('saved');

  const colors = slotColors[slot] || slotColors.dinner;

  const filteredSaved = useMemo(() => {
    let meals = savedMeals;
    // Filter by meal type tag if the meal has meal_types
    meals = meals.filter(m => !m.meal_types || m.meal_types.length === 0 || m.meal_types.includes(slot));
    if (search.trim()) {
      const q = search.toLowerCase();
      meals = meals.filter(m => m.name.toLowerCase().includes(q));
    }
    return meals;
  }, [savedMeals, slot, search]);

  const filteredFreezer = useMemo(() => {
    let items = freezerItems.filter(f => f.quantity > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(f => f.name.toLowerCase().includes(q));
    }
    return items;
  }, [freezerItems, search]);

  const handleSelect = (meal: any, type: 'saved-meal' | 'freezer') => {
    onSelect({ id: meal.id, name: meal.name, emoji: meal.emoji ?? null }, type);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Pick a meal</h2>
                <p className="text-sm text-gray-500">
                  {dateLabel} &middot; <span className="capitalize">{colors.label}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search meals..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTab('saved')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'saved'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Saved Meals ({filteredSaved.length})
              </button>
              <button
                onClick={() => setTab('freezer')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'freezer'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Freezer ({filteredFreezer.length})
              </button>
            </div>

            {/* Meal list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {tab === 'saved' && (
                <>
                  {filteredSaved.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">
                      {search ? 'No meals match your search' : 'No saved meals yet'}
                    </p>
                  ) : (
                    filteredSaved.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelect(m, 'saved-meal')}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors text-left"
                      >
                        <span className="text-2xl">{m.emoji || '🍽️'}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-800 block truncate">{m.name}</span>
                        </div>
                        {isFavorite(m.id) && (
                          <Heart size={14} className="fill-red-500 text-red-500 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </>
              )}

              {tab === 'freezer' && (
                <>
                  {filteredFreezer.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">
                      {search ? 'No freezer items match your search' : 'No freezer items in stock'}
                    </p>
                  ) : (
                    filteredFreezer.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleSelect(f, 'freezer')}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors text-left"
                      >
                        <span className="text-2xl">{f.emoji || '🥶'}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-800 block truncate">{f.name}</span>
                          <span className="text-xs text-gray-500">Qty: {f.quantity}</span>
                        </div>
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
