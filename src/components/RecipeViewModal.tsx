// src/components/RecipeViewModal.tsx
// Big, glanceable recipe view for cooking at the kitchen tablet.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Users, Minus, Plus, ExternalLink, ShoppingCart, ChefHat, Pencil, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSavedMeal } from '../lib/mealsApi';
import { listPantryItems, type PantryItem } from '../lib/pantryApi';
import { addGroceryItem, listGroceryItems, type GroceryItem, type GroceryItemInput } from '../lib/groceryApi';
import { formatQuantity, groceryItemsForMatches, matchIngredientsToPantry, type IngredientStatus } from '../lib/recipeMatching';
import { CookedMealModal } from './CookedMealModal';
import type { SavedMeal } from '../types/recipe';

interface RecipeViewModalProps {
  /** Loaded by id when the full meal isn't already at hand */
  mealId: string | null;
  meal?: SavedMeal | null;
  onClose: () => void;
  onEdit?: (meal: SavedMeal) => void;
}

const STATUS_BADGE: Record<Exclude<IngredientStatus, 'staple'>, { label: string; className: string }> = {
  have: { label: 'in pantry', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  low: { label: 'not enough', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  missing: { label: 'need', className: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
};

export const RecipeViewModal: React.FC<RecipeViewModalProps> = ({ mealId, meal: providedMeal, onClose, onEdit }) => {
  const [meal, setMeal] = useState<SavedMeal | null>(providedMeal ?? null);
  const [loading, setLoading] = useState(!providedMeal);
  const [pantry, setPantry] = useState<PantryItem[] | null>(null);
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [servings, setServings] = useState<number | null>(providedMeal?.servings ?? null);
  const [multiplier, setMultiplier] = useState(1);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [groceryDraft, setGroceryDraft] = useState<{ item: GroceryItemInput; selected: boolean }[] | null>(null);
  const [addingGroceries, setAddingGroceries] = useState(false);
  const [showCooked, setShowCooked] = useState(false);

  const open = !!mealId;

  useEffect(() => {
    if (!mealId) return;
    setTicked(new Set());
    setCurrentStep(null);
    setGroceryDraft(null);
    setMultiplier(1);

    if (providedMeal && providedMeal.id === mealId) {
      setMeal(providedMeal);
      setServings(providedMeal.servings);
      setLoading(false);
    } else {
      setLoading(true);
      getSavedMeal(mealId)
        .then((m) => { setMeal(m); setServings(m?.servings ?? null); })
        .catch(() => toast.error('Could not load the recipe'))
        .finally(() => setLoading(false));
    }

    listPantryItems().then(setPantry).catch(() => setPantry(null));
    listGroceryItems().then(setGroceries).catch(() => setGroceries([]));
  }, [mealId, providedMeal]);

  // Keep the tablet screen on while a recipe is open
  useEffect(() => {
    if (!open || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, [open]);

  const scale = meal?.servings && servings ? servings / meal.servings : multiplier;
  const ingredients = useMemo(() => meal?.ingredients ?? [], [meal]);
  const steps = meal?.steps ?? [];

  const matches = useMemo(
    () => (pantry ? matchIngredientsToPantry(ingredients, pantry, scale) : null),
    [ingredients, pantry, scale]
  );

  const groceryCandidates = useMemo(
    () => (matches ? groceryItemsForMatches(matches, groceries) : []),
    [matches, groceries]
  );

  const toggleTick = (index: number) => {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addSelectedGroceries = async () => {
    if (!groceryDraft) return;
    const chosen = groceryDraft.filter((d) => d.selected).map((d) => d.item);
    if (chosen.length === 0) return;
    setAddingGroceries(true);
    try {
      for (const item of chosen) await addGroceryItem(item);
      toast.success(`Added ${chosen.length} item${chosen.length === 1 ? '' : 's'} to the grocery list 🛒`);
      setGroceryDraft(null);
      setGroceries(await listGroceryItems());
    } catch {
      toast.error('Failed to add to grocery list');
    } finally {
      setAddingGroceries(false);
    }
  };

  const totalMinutes = (meal?.prep_minutes ?? 0) + (meal?.cook_minutes ?? 0);

  // Portal: the board's summary cards create stacking contexts that would trap a fixed overlay
  return createPortal(
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl h-full max-h-[95vh] flex flex-col overflow-hidden"
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {loading || !meal ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                {loading ? 'Loading recipe...' : 'Recipe not found'}
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="relative shrink-0">
                  {meal.recipe_image_url ? (
                    <div className="h-36 sm:h-44 w-full">
                      <img src={meal.recipe_image_url} alt={meal.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </div>
                  ) : (
                    <div className="h-20 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-gray-700 dark:to-gray-700" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-3 flex items-end gap-3">
                    <span className="text-4xl drop-shadow">{meal.emoji ?? '🍽️'}</span>
                    <h2 className={`text-2xl sm:text-3xl font-bold leading-tight ${meal.recipe_image_url ? 'text-white drop-shadow' : 'text-gray-800 dark:text-white'}`}>
                      {meal.name}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow hover:bg-white"
                    aria-label="Close recipe"
                  >
                    <X size={22} className="text-gray-700 dark:text-gray-200" />
                  </button>
                </div>

                {/* Meta bar */}
                <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b dark:border-gray-700 shrink-0">
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
                    <button
                      onClick={() =>
                        meal.servings && servings
                          ? setServings(Math.max(1, servings - 1))
                          : setMultiplier((m) => Math.max(0.5, m - 0.5))
                      }
                      className="p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-600"
                      aria-label="Fewer servings"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="flex items-center gap-1 px-2 text-sm font-semibold text-gray-800 dark:text-gray-100 min-w-[84px] justify-center">
                      <Users size={15} />
                      {meal.servings && servings ? `Serves ${servings}` : `×${formatQuantity(multiplier)}`}
                    </span>
                    <button
                      onClick={() =>
                        meal.servings && servings ? setServings(servings + 1) : setMultiplier((m) => m + 0.5)
                      }
                      className="p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-600"
                      aria-label="More servings"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {totalMinutes > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1.5">
                      <Clock size={15} />
                      {meal.prep_minutes ? `${meal.prep_minutes}m prep` : ''}
                      {meal.prep_minutes && meal.cook_minutes ? ' · ' : ''}
                      {meal.cook_minutes ? `${meal.cook_minutes}m cook` : ''}
                    </span>
                  )}
                  {meal.recipe_source_url && (
                    <a
                      href={meal.recipe_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-purple-700 dark:text-purple-300 hover:underline px-2"
                    >
                      <ExternalLink size={15} /> Original
                    </a>
                  )}
                  <div className="flex-1" />
                  {onEdit && (
                    <button
                      onClick={() => onEdit(meal)}
                      className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Pencil size={15} /> Edit
                    </button>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                  {ingredients.length === 0 && steps.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                      No recipe saved for this meal yet{onEdit ? ' — tap Edit to import one.' : '.'}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-[2fr_3fr] gap-6 p-5">
                      {/* Ingredients */}
                      <section>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Ingredients</h3>
                        <ul className="space-y-1">
                          {ingredients.map((ing, i) => {
                            const match = matches?.[i];
                            const done = ticked.has(i);
                            const unitLabel = ing.unit && ing.unit !== 'item' ? ` ${ing.unit}` : '';
                            const scaledLabel =
                              scale !== 1 && match?.needed != null ? `${formatQuantity(match.needed)}${unitLabel}` : null;
                            const badge = match && match.status !== 'staple' ? STATUS_BADGE[match.status] : null;
                            return (
                              <li key={i}>
                                <button
                                  onClick={() => toggleTick(i)}
                                  className={`w-full flex items-start gap-3 text-left rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${done ? 'opacity-50' : ''}`}
                                >
                                  <span
                                    className={`mt-0.5 w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center ${
                                      done ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500'
                                    }`}
                                  >
                                    {done && <Check size={14} className="text-white" />}
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    {/* Scaled: the new amount leads, the original recipe line is kept dimmed for reference */}
                                    {scaledLabel && (
                                      <span className={`font-bold text-purple-700 dark:text-purple-300 mr-2 ${done ? 'line-through' : ''}`}>
                                        {scaledLabel}
                                      </span>
                                    )}
                                    <span
                                      className={`${scaledLabel ? 'text-sm text-gray-400 dark:text-gray-500' : 'text-base text-gray-800 dark:text-gray-100'} ${done ? 'line-through' : ''}`}
                                    >
                                      {scaledLabel && 'recipe: '}
                                      {ing.text || `${formatQuantity(ing.quantity)} ${ing.unit ?? ''} ${ing.name}`.trim()}
                                    </span>
                                    {ing.staple && <span className="ml-1.5 text-xs text-gray-400">🧂</span>}
                                  </span>
                                  {badge && (
                                    <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 ${badge.className}`}>
                                      {badge.label}
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>

                        {matches && groceryCandidates.length > 0 && !groceryDraft && (
                          <button
                            onClick={() => setGroceryDraft(groceryCandidates.map((item) => ({ item, selected: true })))}
                            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
                          >
                            <ShoppingCart size={18} /> Add {groceryCandidates.length} missing to grocery list
                          </button>
                        )}
                        {matches && groceryCandidates.length === 0 && ingredients.some((ing) => !ing.staple) && (
                          <p className="mt-4 text-sm text-green-700 dark:text-green-300 text-center">
                            ✓ Everything is in the pantry or already on the grocery list
                          </p>
                        )}

                        {groceryDraft && (
                          <div className="mt-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-900/20 p-3 space-y-2">
                            <div className="text-sm font-semibold text-green-800 dark:text-green-200">Add to grocery list</div>
                            {groceryDraft.map((d, i) => (
                              <label key={d.item.name} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={d.selected}
                                  onChange={() =>
                                    setGroceryDraft((prev) => prev?.map((x, idx) => (idx === i ? { ...x, selected: !x.selected } : x)) ?? null)
                                  }
                                  className="w-4 h-4 accent-green-600"
                                />
                                <span>{d.item.emoji}</span>
                                <span className="flex-1">{d.item.name}</span>
                                <span className="text-xs text-gray-500">
                                  {formatQuantity(d.item.quantity ?? 1)} {d.item.unit}
                                </span>
                              </label>
                            ))}
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => setGroceryDraft(null)}
                                className="flex-1 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={addSelectedGroceries}
                                disabled={addingGroceries || !groceryDraft.some((d) => d.selected)}
                                className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                              >
                                {addingGroceries ? 'Adding...' : `Add ${groceryDraft.filter((d) => d.selected).length}`}
                              </button>
                            </div>
                          </div>
                        )}
                      </section>

                      {/* Steps */}
                      <section>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Method</h3>
                        {steps.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400">No steps saved.</p>
                        ) : (
                          <ol className="space-y-2">
                            {steps.map((step, i) => {
                              const active = currentStep === i;
                              const past = currentStep !== null && i < currentStep;
                              return (
                                <li key={i}>
                                  <button
                                    onClick={() => setCurrentStep(active ? null : i)}
                                    className={`w-full flex gap-3 text-left rounded-xl p-3 transition-colors ${
                                      active
                                        ? 'bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-400'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    } ${past ? 'opacity-50' : ''}`}
                                  >
                                    <span
                                      className={`w-8 h-8 shrink-0 rounded-full text-base font-bold flex items-center justify-center ${
                                        active ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-100'
                                      }`}
                                    >
                                      {i + 1}
                                    </span>
                                    <span className="text-lg leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-line">{step}</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ol>
                        )}
                        {meal.notes && (
                          <div className="mt-5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-4 text-gray-700 dark:text-gray-200 whitespace-pre-line">
                            💡 {meal.notes}
                          </div>
                        )}
                      </section>
                    </div>
                  )}
                </div>

                {ingredients.length > 0 && (
                  <div className="p-3 border-t dark:border-gray-700 shrink-0">
                    <button
                      onClick={() => setShowCooked(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
                    >
                      <ChefHat size={20} /> Cooked it — update pantry
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
      {meal && (
        <CookedMealModal
          open={showCooked}
          mealName={meal.name}
          ingredients={ingredients}
          scale={scale}
          onClose={() => {
            setShowCooked(false);
            listPantryItems().then(setPantry).catch(() => {});
          }}
        />
      )}
    </>,
    document.body
  );
};
