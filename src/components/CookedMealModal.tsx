// src/components/CookedMealModal.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChefHat, Sparkles } from 'lucide-react';
import { listPantryItems, deductPantryQuantities, type PantryItem } from '../lib/pantryApi';
import { getCookedMealDeductions } from '../lib/aiApi';
import toast from 'react-hot-toast';

interface CookedMealModalProps {
  open: boolean;
  mealName: string;
  onClose: () => void;
}

interface DeductionRow {
  id: string;
  name: string;
  emoji: string;
  unit: string;
  available: number;
  use: number;
}

export const CookedMealModal: React.FC<CookedMealModalProps> = ({ open, mealName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DeductionRow[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && mealName) analyze();
    if (!open) {
      setRows([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mealName]);

  async function analyze() {
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      const items = (await listPantryItems()).filter((it) => it.quantity > 0);
      setPantry(items);
      if (items.length === 0) {
        setError('Your pantry is empty — nothing to deduct.');
        return;
      }

      const deductions = await getCookedMealDeductions(
        mealName,
        items.map((it) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          location: it.location,
        }))
      );

      const byId = new Map(items.map((it) => [it.id, it]));
      const valid: DeductionRow[] = [];
      for (const d of deductions) {
        const item = byId.get(d.id);
        if (!item || !(d.quantity > 0)) continue;
        valid.push({
          id: item.id,
          name: item.name,
          emoji: item.emoji,
          unit: item.unit,
          available: item.quantity,
          use: Math.min(d.quantity, item.quantity),
        });
      }
      setRows(valid);
      if (valid.length === 0) {
        setError("Couldn't match this meal to your pantry — you can add ingredients below.");
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to estimate ingredients');
    } finally {
      setLoading(false);
    }
  }

  function updateUse(id: string, use: number) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, use: Math.max(0, Math.min(use, r.available)) } : r))
    );
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addRow(id: string) {
    const item = pantry.find((it) => it.id === id);
    if (!item || rows.some((r) => r.id === id)) return;
    setRows((prev) => [
      ...prev,
      { id: item.id, name: item.name, emoji: item.emoji, unit: item.unit, available: item.quantity, use: 1 },
    ]);
  }

  async function handleConfirm() {
    const toDeduct = rows.filter((r) => r.use > 0);
    if (toDeduct.length === 0) return;

    setSaving(true);
    try {
      const updated = await deductPantryQuantities(
        toDeduct.map((r) => ({ id: r.id, quantity: r.use }))
      );
      const outOfStock = updated.filter((it) => it.quantity === 0);
      toast.success(
        outOfStock.length > 0
          ? `Pantry updated! ${outOfStock.length} item${outOfStock.length === 1 ? ' is' : 's are'} now out of stock.`
          : 'Pantry updated!'
      );
      onClose();
    } catch {
      toast.error('Failed to update pantry');
    } finally {
      setSaving(false);
    }
  }

  const remaining = pantry.filter((it) => !rows.some((r) => r.id === it.id));

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !saving && onClose()}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <ChefHat size={18} className="text-purple-500" /> Cooked: {mealName}
              </h3>
              <button
                onClick={() => !saving && onClose()}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X size={20} className="dark:text-gray-300" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-purple-600 dark:text-purple-300">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  >
                    <Sparkles size={18} />
                  </motion.div>
                  <span className="text-sm font-medium">Working out what you used...</span>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3">
                      {error}
                    </div>
                  )}

                  {rows.length > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      These will be deducted from your pantry — adjust before confirming:
                    </p>
                  )}

                  {rows.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-700"
                    >
                      <span className="text-xl w-7 text-center">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate dark:text-white">{r.name}</div>
                        <div className="text-xs text-gray-400">
                          have {r.available} {r.unit}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={r.available}
                        step="0.1"
                        value={r.use}
                        onChange={(e) => updateUse(r.id, parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <span className="text-xs text-gray-400 w-10 truncate">{r.unit}</span>
                      <button
                        onClick={() => removeRow(r.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  ))}

                  {!loading && remaining.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => e.target.value && addRow(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="">+ Add another ingredient...</option>
                      {remaining.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.emoji} {it.name} ({it.quantity} {it.unit})
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>

            {!loading && (
              <div className="p-4 border-t dark:border-gray-700">
                <button
                  onClick={handleConfirm}
                  disabled={saving || rows.filter((r) => r.use > 0).length === 0}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Updating pantry...' : 'Deduct from Pantry'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
