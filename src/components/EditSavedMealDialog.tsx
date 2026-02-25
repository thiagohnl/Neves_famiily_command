import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

interface EditSavedMealDialogProps {
  meal: {
    id: string;
    name: string;
    emoji: string;
    meal_types?: string[];
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { name: string; emoji: string; meal_types: string[] }) => Promise<void>;
}

export const EditSavedMealDialog: React.FC<EditSavedMealDialogProps> = ({
  meal,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(meal.name);
  const [emoji, setEmoji] = useState(meal.emoji);
  const [mealTypes, setMealTypes] = useState<string[]>(meal.meal_types || ['lunch', 'dinner']);
  const [saving, setSaving] = useState(false);

  const toggleMealType = (type: string) => {
    setMealTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const finalMealTypes = mealTypes.length === 0 ? ['lunch', 'dinner'] : mealTypes;

    setSaving(true);
    try {
      await onSave(meal.id, { name: name.trim(), emoji, meal_types: finalMealTypes });
      onClose();
    } catch (error) {
      console.error('Failed to update meal:', error);
    } finally {
      setSaving(false);
    }
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
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-visible"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Edit Saved Meal</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meal Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter meal name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emoji
                </label>
                <EmojiPicker
                  value={emoji}
                  onChange={setEmoji}
                  variant="meals"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meal Types
                </label>
                <div className="space-y-2">
                  {['breakfast', 'lunch', 'dinner'].map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={mealTypes.includes(type)}
                        onChange={() => toggleMealType(type)}
                        className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
                {mealTypes.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">Defaults to Lunch & Dinner if none selected</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
