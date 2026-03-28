// src/components/PantryPanel.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, AlertTriangle, Search, ShoppingCart } from 'lucide-react';
import { usePantry } from '../hooks/usePantry';
import { AddPantryItemModal } from './AddPantryItemModal';
import {
  PANTRY_LOCATIONS,
  LOCATION_LABELS,
  LOCATION_EMOJIS,
  CATEGORY_EMOJIS,
  type PantryLocation,
} from '../constants/pantry';
import type { PantryItem } from '../lib/pantryApi';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface PantryPanelProps {
  isParentMode: boolean;
  onAddToGrocery?: (item: PantryItem) => void;
}

export const PantryPanel: React.FC<PantryPanelProps> = ({ isParentMode, onAddToGrocery }) => {
  const [activeTab, setActiveTab] = useState<PantryLocation | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const location = activeTab === 'all' ? undefined : activeTab;
  const { items, loading, add, adjustQty, remove } = usePantry(location);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.category && it.category.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, PantryItem[]> = {};
    for (const item of filteredItems) {
      const key = item.category || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems]);

  function getExpiryBadge(expiryDate: string | null) {
    if (!expiryDate) return null;
    const days = dayjs(expiryDate).diff(dayjs(), 'day');
    if (days < 0) return { label: 'Expired', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
    if (days <= 3) return { label: `${days}d left`, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
    if (days <= 7) return { label: `${days}d left`, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' };
    return null;
  }

  async function handleAdd(input: any) {
    try {
      await add(input);
      toast.success('Item added to pantry!');
    } catch {
      toast.error('Failed to add item');
    }
  }

  async function handleAdjustQty(id: string, delta: number) {
    try {
      await adjustQty(id, delta);
    } catch {
      toast.error('Failed to update quantity');
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold dark:text-white">Pantry Stock</h3>
        {isParentMode && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} /> Add Item
          </button>
        )}
      </div>

      {/* Location Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-white dark:bg-gray-600 shadow-sm text-purple-700 dark:text-purple-300'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          All
        </button>
        {PANTRY_LOCATIONS.map((loc) => (
          <button
            key={loc}
            onClick={() => setActiveTab(loc)}
            className={`flex-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === loc
                ? 'bg-white dark:bg-gray-600 shadow-sm text-purple-700 dark:text-purple-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {LOCATION_EMOJIS[loc]} {LOCATION_LABELS[loc]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search pantry..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* Items */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading pantry...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {searchQuery ? 'No items match your search' : 'No items in pantry yet'}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedItems.map(([category, categoryItems]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                {CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS] || '📦'}{' '}
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h4>
              <div className="space-y-1">
                <AnimatePresence>
                  {categoryItems.map((item) => {
                    const badge = getExpiryBadge(item.expiry_date);
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 ${
                          item.quantity === 0 ? 'opacity-50' : ''
                        }`}
                      >
                        <span className="text-xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate dark:text-white">{item.name}</span>
                            {activeTab === 'all' && (
                              <span className="text-xs text-gray-400">
                                {LOCATION_EMOJIS[item.location as PantryLocation]}
                              </span>
                            )}
                            {badge && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {item.quantity} {item.unit}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAdjustQty(item.id, -1)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <Minus size={14} className="text-gray-500 dark:text-gray-400" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleAdjustQty(item.id, 1)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <Plus size={14} className="text-gray-500 dark:text-gray-400" />
                          </button>

                          {item.quantity === 0 && onAddToGrocery && (
                            <button
                              onClick={() => onAddToGrocery(item)}
                              className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900 rounded transition-colors"
                              title="Add to grocery list"
                            >
                              <ShoppingCart size={14} className="text-yellow-600" />
                            </button>
                          )}

                          {isParentMode && (
                            <button
                              onClick={() => handleRemove(item.id)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AddPantryItemModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
        defaultLocation={activeTab === 'all' ? 'cupboard' : activeTab}
      />
    </div>
  );
};
