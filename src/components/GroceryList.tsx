// src/components/GroceryList.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check, Package, ShoppingCart, X } from 'lucide-react';
import { useGroceryList } from '../hooks/useGroceryList';
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
import type { GroceryItem } from '../lib/groceryApi';
import toast from 'react-hot-toast';

interface GroceryListProps {
  isParentMode: boolean;
}

export const GroceryList: React.FC<GroceryListProps> = ({ isParentMode }) => {
  const { toBuy, purchased, loading, add, togglePurchased, transfer, remove, clearDone } = useGroceryList();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    emoji: '🛒',
    category: '' as PantryCategory | '',
    quantity: 1,
    unit: 'item' as PantryUnit,
    target_location: 'cupboard' as PantryLocation,
  });

  // Group toBuy items by category
  const groupedToBuy = useMemo(() => {
    const groups: Record<string, GroceryItem[]> = {};
    for (const item of toBuy) {
      const key = item.category || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [toBuy]);

  async function handleAdd() {
    if (!newItem.name.trim()) return;
    try {
      await add({
        name: newItem.name.trim(),
        emoji: newItem.emoji,
        category: newItem.category || undefined,
        quantity: newItem.quantity,
        unit: newItem.unit,
        target_location: newItem.target_location,
      });
      setNewItem({ name: '', emoji: '🛒', category: '', quantity: 1, unit: 'item', target_location: 'cupboard' });
      setShowAddForm(false);
      toast.success('Added to grocery list!');
    } catch {
      toast.error('Failed to add item');
    }
  }

  async function handleToggle(id: string) {
    try {
      await togglePurchased(id);
    } catch {
      toast.error('Failed to update item');
    }
  }

  async function handleTransfer(item: GroceryItem) {
    try {
      await transfer(item);
      toast.success(`${item.name} added to pantry!`);
    } catch {
      toast.error('Failed to add to pantry');
    }
  }

  async function handleRemove(id: string) {
    try {
      await remove(id);
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    }
  }

  async function handleClearDone() {
    try {
      await clearDone();
      toast.success('Cleared completed items');
    } catch {
      toast.error('Failed to clear items');
    }
  }

  function handleCategoryChange(cat: PantryCategory | '') {
    setNewItem((prev) => ({
      ...prev,
      category: cat,
      emoji: cat && CATEGORY_EMOJIS[cat] ? CATEGORY_EMOJIS[cat] : prev.emoji,
    }));
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading grocery list...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
            <ShoppingCart size={20} /> Grocery List
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {toBuy.length} item{toBuy.length !== 1 ? 's' : ''} to buy
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Quick Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium dark:text-white">Add Grocery Item</h4>
                <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                  <X size={16} className="dark:text-gray-300" />
                </button>
              </div>

              {/* Name + Emoji */}
              <div className="flex gap-3">
                <EmojiPicker value={newItem.emoji} onChange={(emoji) => setNewItem((p) => ({ ...p, emoji }))} />
                <input
                  type="text"
                  placeholder="Item name..."
                  value={newItem.name}
                  onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <select
                  value={newItem.category}
                  onChange={(e) => handleCategoryChange(e.target.value as PantryCategory | '')}
                  className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">Category</option>
                  {PANTRY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_EMOJIS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>

                {/* Target Location */}
                <select
                  value={newItem.target_location}
                  onChange={(e) => setNewItem((p) => ({ ...p, target_location: e.target.value as PantryLocation }))}
                  className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {PANTRY_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>Goes to {LOCATION_LABELS[loc]}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                {/* Quantity */}
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-20 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                {/* Unit */}
                <select
                  value={newItem.unit}
                  onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value as PantryUnit }))}
                  className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {PANTRY_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

                <button
                  onClick={handleAdd}
                  disabled={!newItem.name.trim()}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* To Buy Section */}
      {groupedToBuy.length === 0 && purchased.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
          <p>Your grocery list is empty</p>
          <p className="text-sm mt-1">Add items to get started</p>
        </div>
      ) : (
        <>
          {groupedToBuy.map(([category, categoryItems]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                {CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS] || '📦'}{' '}
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h4>
              <div className="space-y-1">
                <AnimatePresence>
                  {categoryItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 hover:shadow-sm transition-shadow"
                    >
                      <button
                        onClick={() => handleToggle(item.id)}
                        className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-green-500 transition-colors flex-shrink-0"
                      >
                        {/* empty circle */}
                      </button>
                      <span className="text-xl">{item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium dark:text-white">{item.name}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}

          {/* Purchased Section */}
          {purchased.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                  Purchased ({purchased.length})
                </h4>
                <button
                  onClick={handleClearDone}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear done
                </button>
              </div>
              <div className="space-y-1">
                <AnimatePresence>
                  {purchased.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40"
                    >
                      <button
                        onClick={() => handleToggle(item.id)}
                        className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"
                      >
                        <Check size={14} className="text-white" />
                      </button>
                      <span className="text-xl opacity-60">{item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 line-through">
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      {!item.added_to_pantry && (
                        <button
                          onClick={() => handleTransfer(item)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        >
                          <Package size={12} /> Add to Pantry
                        </button>
                      )}
                      {item.added_to_pantry && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          In pantry
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
