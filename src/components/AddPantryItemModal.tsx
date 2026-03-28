// src/components/AddPantryItemModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import {
  PANTRY_LOCATIONS,
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  LOCATION_LABELS,
  CATEGORY_EMOJIS,
  type PantryLocation,
  type PantryCategory,
  type PantryUnit,
} from '../constants/pantry';
import type { PantryItemInput } from '../lib/pantryApi';

interface AddPantryItemModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (input: PantryItemInput) => Promise<void>;
  defaultLocation?: PantryLocation;
}

export const AddPantryItemModal: React.FC<AddPantryItemModalProps> = ({
  open,
  onClose,
  onAdd,
  defaultLocation = 'cupboard',
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🥫');
  const [category, setCategory] = useState<PantryCategory | ''>('');
  const [location, setLocation] = useState<PantryLocation>(defaultLocation);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<PantryUnit>('item');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName('');
    setEmoji('🥫');
    setCategory('');
    setLocation(defaultLocation);
    setQuantity(1);
    setUnit('item');
    setExpiryDate('');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        emoji,
        category: category || undefined,
        location,
        quantity,
        unit,
        expiry_date: expiryDate || null,
        notes: notes.trim() || undefined,
      });
      resetForm();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleCategoryChange(cat: PantryCategory | '') {
    setCategory(cat);
    if (cat && CATEGORY_EMOJIS[cat]) {
      setEmoji(CATEGORY_EMOJIS[cat]);
    }
  }

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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold dark:text-white">Add Pantry Item</h3>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X size={20} className="dark:text-gray-300" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Name + Emoji */}
              <div className="flex gap-3">
                <EmojiPicker value={emoji} onChange={setEmoji} />
                <input
                  type="text"
                  placeholder="Item name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  autoFocus
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Location</label>
                <div className="flex gap-2">
                  {PANTRY_LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        location === loc
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-400 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {LOCATION_LABELS[loc]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as PantryCategory | '')}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">None</option>
                  {PANTRY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_EMOJIS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity + Unit */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as PantryUnit)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {PANTRY_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Brand, size..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!name.trim() || saving}
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Adding...' : 'Add to Pantry'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
