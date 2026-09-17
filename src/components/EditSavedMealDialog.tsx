import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Link2, Camera, Images, ClipboardPaste, ChevronUp, ChevronDown, Trash2, Plus, Sparkles, ImagePlus,
} from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { uploadRecipePhoto } from '../lib/mealsApi';
import {
  importRecipeFromPhotos,
  importRecipeFromText,
  importRecipeFromUrl,
  RecipeImportError,
  type ImportedRecipe,
} from '../lib/recipeApi';
import { hasRecipe, type RecipeIngredient, type SavedMeal, type SavedMealInput } from '../types/recipe';

type Tab = 'details' | 'recipe';

interface EditSavedMealDialogProps {
  /** Omit to create a new meal */
  meal?: SavedMeal | null;
  isOpen: boolean;
  initialTab?: Tab;
  onClose: () => void;
  onSave: (id: string | null, updates: SavedMealInput) => Promise<void>;
}

const UNIT_SUGGESTIONS = ['g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup', 'clove', 'pinch', 'slice', 'can', 'bunch', 'pack'];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

const blankIngredient = (): RecipeIngredient => ({
  text: '', name: '', quantity: null, unit: null, emoji: '🥄', category: 'other', staple: false,
});

const parseOptionalInt = (value: string) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const EditSavedMealDialog: React.FC<EditSavedMealDialogProps> = ({
  meal,
  isOpen,
  initialTab = 'details',
  onClose,
  onSave,
}) => {
  const isCreate = !meal;
  const [tab, setTab] = useState<Tab>(initialTab);

  const [name, setName] = useState(meal?.name ?? '');
  const [emoji, setEmoji] = useState(meal?.emoji ?? '🍽️');
  const [mealTypes, setMealTypes] = useState<string[]>(meal?.meal_types ?? ['lunch', 'dinner']);
  const [notes, setNotes] = useState(meal?.notes ?? '');

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(meal?.ingredients ?? []);
  const [steps, setSteps] = useState<string[]>(meal?.steps ?? []);
  const [servings, setServings] = useState<number | null>(meal?.servings ?? null);
  const [prepMinutes, setPrepMinutes] = useState<number | null>(meal?.prep_minutes ?? null);
  const [cookMinutes, setCookMinutes] = useState<number | null>(meal?.cook_minutes ?? null);
  const [sourceUrl, setSourceUrl] = useState(meal?.recipe_source_url ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(meal?.recipe_image_url ?? null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);

  const [linkInput, setLinkInput] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<{ message: string; suggestFallback: boolean } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const screenshotsInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const coverPreview = useMemo(() => (coverBlob ? URL.createObjectURL(coverBlob) : null), [coverBlob]);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const toggleMealType = (type: string) => {
    setMealTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  // ---------- Import ----------

  const applyImport = (recipe: ImportedRecipe, importWarnings: string[]) => {
    if (hasRecipe({ ingredients, steps }) && !window.confirm('Replace the current recipe with the imported one?')) return;

    setIngredients(recipe.ingredients);
    setSteps(recipe.steps);
    setServings(recipe.servings);
    setPrepMinutes(recipe.prep_minutes);
    setCookMinutes(recipe.cook_minutes);
    if (recipe.source_url) setSourceUrl(recipe.source_url);
    if (recipe.cover) setCoverBlob(recipe.cover);
    if (recipe.notes && !notes.trim()) setNotes(recipe.notes);
    // Keep the family's own name for existing meals; fill it in for new ones
    if (!name.trim()) {
      setName(recipe.name);
      setEmoji(recipe.emoji);
      setMealTypes(recipe.meal_types);
      setNameError(false);
    }
    setWarnings(importWarnings);
    setLinkInput('');
    setPasteText('');
    setShowPaste(false);
  };

  const runImport = async (request: () => Promise<{ recipe: ImportedRecipe; warnings: string[] }>) => {
    setImporting(true);
    setImportError(null);
    setWarnings([]);
    try {
      const { recipe, warnings: importWarnings } = await request();
      applyImport(recipe, importWarnings);
    } catch (e) {
      const suggestFallback = e instanceof RecipeImportError && e.suggestFallback;
      setImportError({ message: (e as Error)?.message || 'Import failed', suggestFallback });
      if (suggestFallback) setShowPaste(true);
    } finally {
      setImporting(false);
    }
  };

  const handlePhotos = (files: FileList | null) => {
    const images = Array.from(files ?? []).filter((f) => f.type.startsWith('image/')).slice(0, 4);
    if (images.length > 0) runImport(() => importRecipeFromPhotos(images));
  };

  // ---------- Ingredients / steps ----------

  const updateIngredient = (index: number, patch: Partial<RecipeIngredient>) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)));
  };

  const moveStep = (index: number, delta: number) => {
    setSteps((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // ---------- Save ----------

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(true);
      setTab('details');
      return;
    }

    setSaving(true);
    try {
      let recipeImageUrl = imageUrl;
      if (coverBlob) {
        recipeImageUrl = await uploadRecipePhoto(coverBlob, meal?.id ?? crypto.randomUUID());
      }

      const cleanIngredients = ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          ...ing,
          name: ing.name.trim(),
          unit: ing.unit?.trim() || null,
          text: ing.text.trim() || [ing.quantity, ing.unit, ing.name].filter((v) => v != null && v !== '').join(' '),
        }));

      await onSave(meal?.id ?? null, {
        name: name.trim(),
        emoji,
        meal_types: mealTypes.length === 0 ? ['lunch', 'dinner'] : mealTypes,
        notes: notes.trim() || null,
        ingredients: cleanIngredients,
        steps: steps.map((s) => s.trim()).filter(Boolean),
        servings,
        prep_minutes: prepMinutes,
        cook_minutes: cookMinutes,
        recipe_source_url: sourceUrl.trim() || null,
        recipe_image_url: recipeImageUrl,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save meal:', error);
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || importing;
  const shownCover = coverPreview ?? imageUrl;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !busy && onClose()}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {isCreate ? 'New Meal' : 'Edit Saved Meal'}
              </h2>
              <button
                onClick={() => !busy && onClose()}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X size={20} className="text-gray-500 dark:text-gray-300" />
              </button>
            </div>

            <div className="flex gap-1 mx-4 mt-3 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
              {([
                { key: 'details' as const, label: 'Details' },
                { key: 'recipe' as const, label: hasRecipe({ ingredients, steps }) ? 'Recipe ✓' : 'Recipe' },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    tab === t.key
                      ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {tab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Meal Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setNameError(false); }}
                      className={`${inputClass} ${nameError ? 'border-red-400 ring-2 ring-red-200' : ''}`}
                      placeholder="e.g. Spaghetti Bolognese"
                    />
                    {nameError && <p className="text-xs text-red-500 mt-1">Give the meal a name first.</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Emoji</label>
                    <EmojiPicker value={emoji} onChange={setEmoji} variant="meals" />
                  </div>

                  <div>
                    <label className={labelClass}>Good for</label>
                    <div className="flex gap-2">
                      {['breakfast', 'lunch', 'dinner'].map((type) => {
                        const selected = mealTypes.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleMealType(type)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors border-2 ${
                              selected
                                ? 'bg-purple-100 text-purple-700 border-purple-400 dark:bg-purple-900/40 dark:text-purple-200'
                                : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                    {mealTypes.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">Defaults to Lunch & Dinner if none selected</p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Tips, swaps, who loves it..."
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {tab === 'recipe' && (
                <div className="space-y-5">
                  {/* Import */}
                  <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-900/20 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-800 dark:text-purple-200">
                      <Sparkles size={16} /> Import a recipe
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link2 size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="url"
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && linkInput.trim()) runImport(() => importRecipeFromUrl(linkInput)); }}
                          placeholder="Paste a recipe link"
                          disabled={importing}
                          className={`${inputClass} pl-8`}
                        />
                      </div>
                      <button
                        onClick={() => runImport(() => importRecipeFromUrl(linkInput))}
                        disabled={importing || !linkInput.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Import
                      </button>
                    </div>

                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => { handlePhotos(e.target.files); e.target.value = ''; }}
                    />
                    <input
                      ref={screenshotsInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => { handlePhotos(e.target.files); e.target.value = ''; }}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={importing}
                        className="flex items-center justify-center gap-1.5 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Camera size={16} /> Photo
                      </button>
                      <button
                        onClick={() => screenshotsInputRef.current?.click()}
                        disabled={importing}
                        className="flex items-center justify-center gap-1.5 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Images size={16} /> Screenshots
                      </button>
                      <button
                        onClick={() => setShowPaste((v) => !v)}
                        disabled={importing}
                        className={`flex items-center justify-center gap-1.5 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 ${
                          showPaste
                            ? 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <ClipboardPaste size={16} /> Paste text
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Instagram links often can't be read — copy the caption or add up to 4 screenshots instead.
                    </p>

                    {showPaste && (
                      <div className="space-y-2">
                        <textarea
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                          rows={5}
                          placeholder="Paste the Instagram caption or recipe text here..."
                          disabled={importing}
                          className={inputClass}
                        />
                        <button
                          onClick={() => runImport(() => importRecipeFromText(pasteText))}
                          disabled={importing || !pasteText.trim()}
                          className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Read recipe from text
                        </button>
                      </div>
                    )}

                    {importing && (
                      <div className="flex items-center justify-center gap-2 py-2 text-purple-700 dark:text-purple-300">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                          <Sparkles size={16} />
                        </motion.div>
                        <span className="text-sm font-medium">Reading the recipe...</span>
                      </div>
                    )}
                    {importError && (
                      <div className="text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-2.5">
                        {importError.message}
                      </div>
                    )}
                    {warnings.map((w) => (
                      <div key={w} className="text-sm text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2.5">
                        {w}
                      </div>
                    ))}
                  </div>

                  {/* Cover + basics */}
                  <div className="flex gap-3">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file?.type.startsWith('image/')) setCoverBlob(file);
                        e.target.value = '';
                      }}
                    />
                    <div className="relative w-28 h-28 shrink-0">
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        className="w-full h-full rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 hover:border-purple-400"
                        title="Dish photo"
                      >
                        {shownCover ? (
                          <img src={shownCover} alt="Dish" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <ImagePlus size={22} />
                            <span className="text-xs mt-1">Dish photo</span>
                          </>
                        )}
                      </button>
                      {shownCover && (
                        <button
                          onClick={() => { setCoverBlob(null); setImageUrl(null); }}
                          className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 rounded-full p-1 shadow border dark:border-gray-600"
                          aria-label="Remove photo"
                        >
                          <X size={12} className="text-gray-500" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2 content-start">
                      {([
                        { label: 'Serves', value: servings, set: setServings },
                        { label: 'Prep (min)', value: prepMinutes, set: setPrepMinutes },
                        { label: 'Cook (min)', value: cookMinutes, set: setCookMinutes },
                      ]).map((f) => (
                        <div key={f.label}>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{f.label}</label>
                          <input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={f.value ?? ''}
                            onChange={(e) => f.set(parseOptionalInt(e.target.value))}
                            className={inputClass}
                          />
                        </div>
                      ))}
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Original link</label>
                        <input
                          type="url"
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                          placeholder="https://..."
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Ingredients {ingredients.length > 0 && <span className="text-gray-400 font-normal">({ingredients.length})</span>}
                      </label>
                      <span className="text-xs text-gray-400">🧂 = always in the cupboard</span>
                    </div>
                    <datalist id="recipe-units">
                      {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
                    </datalist>
                    <div className="space-y-1.5">
                      {ingredients.map((ing, i) => (
                        <div key={i} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-700 p-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 text-center text-lg">{ing.emoji}</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={ing.quantity ?? ''}
                              onChange={(e) => {
                                const n = parseFloat(e.target.value);
                                updateIngredient(i, { quantity: Number.isFinite(n) && n > 0 ? n : null });
                              }}
                              placeholder="Qty"
                              className={`${inputClass} !w-16 !px-2`}
                            />
                            <input
                              type="text"
                              list="recipe-units"
                              value={ing.unit ?? ''}
                              onChange={(e) => updateIngredient(i, { unit: e.target.value || null })}
                              placeholder="unit"
                              className={`${inputClass} !w-20 !px-2`}
                            />
                            <input
                              type="text"
                              value={ing.name}
                              onChange={(e) => updateIngredient(i, { name: e.target.value })}
                              placeholder="Ingredient"
                              className={`${inputClass} flex-1 min-w-0`}
                            />
                            <button
                              onClick={() => updateIngredient(i, { staple: !ing.staple })}
                              className={`p-1.5 rounded-lg text-base ${ing.staple ? 'bg-amber-100 dark:bg-amber-900/40' : 'opacity-30 hover:opacity-70'}`}
                              title={ing.staple ? 'Staple — skipped for shopping & pantry' : 'Mark as a staple'}
                            >
                              🧂
                            </button>
                            <button
                              onClick={() => setIngredients((prev) => prev.filter((_, idx) => idx !== i))}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
                              aria-label="Remove ingredient"
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                          {ing.text && ing.text.toLowerCase() !== ing.name.toLowerCase() && (
                            <div className="text-xs text-gray-400 pl-8 pt-0.5 truncate" title={ing.text}>{ing.text}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setIngredients((prev) => [...prev, blankIngredient()])}
                      className="mt-2 flex items-center gap-1 text-sm text-purple-700 dark:text-purple-300 hover:underline"
                    >
                      <Plus size={14} /> Add ingredient
                    </button>
                  </div>

                  {/* Steps */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Method</label>
                    <div className="space-y-2">
                      {steps.map((step, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="w-7 h-7 shrink-0 mt-1 rounded-full bg-purple-600 text-white text-sm font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <textarea
                            value={step}
                            onChange={(e) => setSteps((prev) => prev.map((s, idx) => (idx === i ? e.target.value : s)))}
                            rows={2}
                            className={`${inputClass} flex-1`}
                          />
                          <div className="flex flex-col">
                            <button onClick={() => moveStep(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20" aria-label="Move up">
                              <ChevronUp size={16} />
                            </button>
                            <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20" aria-label="Move down">
                              <ChevronDown size={16} />
                            </button>
                            <button onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))} className="p-1 text-red-300 hover:text-red-500" aria-label="Remove step">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setSteps((prev) => [...prev, ''])}
                      className="mt-2 flex items-center gap-1 text-sm text-purple-700 dark:text-purple-300 hover:underline"
                    >
                      <Plus size={14} /> Add step
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : isCreate ? 'Save Meal' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
