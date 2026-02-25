// src/components/MealPlan.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useSavedMeals, useFreezerMeals, useWeekMealPlan, MealSlot } from '@/hooks/useMeals';
import { FamilyMember } from '../types';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import Confetti from 'react-confetti';
import { EmojiPicker } from './EmojiPicker';
import { useMealFavorites } from '../hooks/useMealFavorites';
import { SuggestionsCarousel } from './SuggestionsCarousel';
import { useMealQuest } from '../hooks/useMealQuest';
import { MealQuestCard } from './MealQuestCard';
import { EditSavedMealDialog } from './EditSavedMealDialog';
import { PlannedMealPopover } from './PlannedMealPopover';
import { updateSavedMeal, deletePlannedMeal, changePlannedMealSlot, copyWeekPlan, clearWeekPlan } from '../lib/mealsApi';
import { MealPickerModal } from './MealPickerModal';
import type { MealType } from '../types/meal-plan';

dayjs.extend(weekOfYear);

interface MealPlanProps {
  familyMembers: FamilyMember[];
  isParentMode: boolean;
}

export const MealPlan: React.FC<MealPlanProps> = ({ familyMembers, isParentMode }) => {
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showAddFreezerModal, setShowAddFreezerModal] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [pendingMeal, setPendingMeal] = useState<{ id: string | null; name: string; emoji: string | null } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mealTypeFilter, setMealTypeFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all');
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const [plannedMealPopover, setPlannedMealPopover] = useState<{ date: string; slot: MealSlot; meal: any; position: { top: number; left: number } } | null>(null);
  const [mealPickerTarget, setMealPickerTarget] = useState<{ date: string; slot: MealSlot; dateLabel: string } | null>(null);

  const [newMeal, setNewMeal] = useState({ name: '', emoji: '🍽️', notes: '' });
  const [newFreezerItem, setNewFreezerItem] = useState({ name: '', emoji: '🧊', notes: '', quantity: 1 });

  const { toggleFavorite, isFavorite, getFavoriteCount, isFamilyFave, isBackInRotation } = useMealFavorites();

  const { items: savedMeals, add: addSavedMeal, remove: removeSavedMeal, refetch: refetchSavedMeals } = useSavedMeals();
  const { items: freezerItems, add: addFreezerItem, adjustQty, remove: removeFreezerItem } = useFreezerMeals();

  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = dayjs();
    const dayOfWeek = today.day();
    const daysFromMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    return today.add(daysFromMonday, 'day');
  });

  const weekStart = useMemo(() => currentWeek.format('YYYY-MM-DD'), [currentWeek]);

  const { items: plannedMeals, plan: planMeal, refetch: refetchWeekPlan } = useWeekMealPlan(weekStart);
  const { challenge, loading: questLoading, trackMealPlan, trackFreezerUse } = useMealQuest(weekStart);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      return currentWeek.add(i, 'day');
    });
  }, [currentWeek]);

  const weekEndDate = useMemo(() => currentWeek.add(6, 'day'), [currentWeek]);
  const weekNumber = useMemo(() => currentWeek.week(), [currentWeek]);

  const handlePreviousWeek = () => {
    setCurrentWeek(currentWeek.subtract(1, 'week'));
  };

  const handleNextWeek = () => {
    setCurrentWeek(currentWeek.add(1, 'week'));
  };

  const filteredSavedMeals = useMemo(() => {
    if (mealTypeFilter === 'all') return savedMeals;
    return savedMeals.filter(meal =>
      meal.meal_types && meal.meal_types.includes(mealTypeFilter)
    );
  }, [savedMeals, mealTypeFilter]);

  const plannedMealsByDate = useMemo(() => {
    return plannedMeals.reduce((acc, meal) => {
      const date = meal.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = {};
      }
      acc[date][meal.slot] = meal;
      return acc;
    }, {} as Record<string, Record<string, any>>);
  }, [plannedMeals]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');

    const mealData = e.dataTransfer.getData('application/json');
    if (!mealData) {
      toast.error('No meal data');
      return;
    }

    const date = el.getAttribute('data-date');
    const slot = el.getAttribute('data-slot') as MealSlot;

    if (!date || !slot) {
      toast.error('Invalid drop target');
      return;
    }

    try {
      const { type, id, name, emoji } = JSON.parse(mealData);

      // Use hook's planMeal for optimistic UI update
      await planMeal(date, slot, {
        id: (type === 'saved-meal' && id) ? id : null,
        name,
        emoji: emoji || null,
      });

      let challengeCompleted = false;

      if (type === 'freezer') {
        await adjustQty(id, -1);
        challengeCompleted = await trackFreezerUse(id);
      } else if (type === 'saved-meal' && id) {
        challengeCompleted = await trackMealPlan(id);
      }

      if (challengeCompleted) {
        setShowConfetti(true);
        toast.success('Chef of the Week unlocked!', { duration: 5000 });
        setTimeout(() => setShowConfetti(false), 5000);
      }

      toast.success(`Planned ${name} for ${slot}!`);
      await refetchWeekPlan();
    } catch (error: any) {
      console.error('Failed to plan meal:', error);
      toast.error('Failed to plan meal: ' + (error?.message || 'unknown error'));
    }
  };

  const allowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');
  };

  const handleAddMeal = async () => {
    if (!newMeal.name.trim()) return;
    
    try {
      await addSavedMeal(newMeal.name, newMeal.emoji, newMeal.notes);
      setNewMeal({ name: '', emoji: '🍽️', notes: '' });
      setShowAddMealModal(false);
      toast.success('Meal added successfully!');
    } catch (error: any) {
      toast.error('Failed to add meal');
    }
  };
  
  const handleDeleteMeal = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      removeSavedMeal(id).then(() => {
        toast.success(`"${name}" deleted.`);
      }).catch(() => {
        toast.error(`Failed to delete "${name}".`);
      });
    }
  };
  
  const handleDeleteFreezerItem = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      removeFreezerItem(id).then(() => {
        toast.success(`"${name}" deleted.`);
      }).catch(() => {
        toast.error(`Failed to delete "${name}".`);
      });
    }
  };

  const handleAddFreezerItem = async () => {
    if (!newFreezerItem.name.trim()) return;

    try {
      await addFreezerItem({ ...newFreezerItem, unit: 'meal' });
      setNewFreezerItem({ name: '', emoji: '🧊', notes: '', quantity: 1 });
      setShowAddFreezerModal(false);
      toast.success('Freezer item added successfully!');
    } catch (error: any) {
      toast.error('Failed to add freezer item');
    }
  };

  const handleAddMealFromSuggestion = (meal: { id: string | null; name: string; emoji: string | null }) => {
    setPendingMeal(meal);
    setShowSlotPicker(true);
  };

  const handleSlotSelect = async (date: string, slot: MealSlot) => {
    if (!pendingMeal) return;

    try {
      await planMeal(date, slot, pendingMeal);

      let challengeCompleted = false;
      if (pendingMeal.id) {
        challengeCompleted = await trackMealPlan(pendingMeal.id);
      }

      if (challengeCompleted) {
        setShowConfetti(true);
        toast.success('🏆 Chef of the Week unlocked!', { duration: 5000 });
        setTimeout(() => setShowConfetti(false), 5000);
      }

      toast.success(`Planned ${pendingMeal.name} for ${slot}!`);
      refetchWeekPlan();
      setShowSlotPicker(false);
      setPendingMeal(null);
    } catch (error: any) {
      console.error('Failed to plan meal:', error);
      toast.error('Failed to plan meal.');
    }
  };

  const handleMealPickerSelect = async (
    meal: { id: string | null; name: string; emoji: string | null },
    type: 'saved-meal' | 'freezer'
  ) => {
    if (!mealPickerTarget) return;

    try {
      await planMeal(mealPickerTarget.date, mealPickerTarget.slot, meal);

      let challengeCompleted = false;
      if (type === 'freezer' && meal.id) {
        await adjustQty(meal.id, -1);
        challengeCompleted = await trackFreezerUse(meal.id);
      } else if (type === 'saved-meal' && meal.id) {
        challengeCompleted = await trackMealPlan(meal.id);
      }

      if (challengeCompleted) {
        setShowConfetti(true);
        toast.success('Chef of the Week unlocked!', { duration: 5000 });
        setTimeout(() => setShowConfetti(false), 5000);
      }

      toast.success(`Planned ${meal.name} for ${mealPickerTarget.slot}!`);
      setMealPickerTarget(null);
      await refetchWeekPlan();
    } catch (error: any) {
      console.error('Failed to plan meal:', error);
      toast.error('Failed to plan meal.');
    }
  };

  const handleCopyLastWeek = async () => {
    const prevWeekStart = currentWeek.subtract(1, 'week');
    const prevStartISO = prevWeekStart.format('YYYY-MM-DD');
    const prevEndISO = prevWeekStart.add(6, 'day').format('YYYY-MM-DD');
    try {
      await copyWeekPlan(prevStartISO, prevEndISO, weekStart);
      await refetchWeekPlan();
      toast.success("Copied last week's plan!");
    } catch {
      toast.error('Failed to copy week.');
    }
  };

  const handleClearWeek = async () => {
    if (!window.confirm('Clear all meals for this week?')) return;
    try {
      const weekEndISO = currentWeek.add(6, 'day').format('YYYY-MM-DD');
      await clearWeekPlan(weekStart, weekEndISO);
      await refetchWeekPlan();
      toast.success('Week cleared!');
    } catch {
      toast.error('Failed to clear week.');
    }
  };

  const handleSaveEditedMeal = async (id: string, updates: { name: string; emoji: string; meal_types: string[] }) => {
    try {
      await updateSavedMeal(id, updates);
      await refetchSavedMeals();
      toast.success('Meal updated!');
    } catch (error: any) {
      console.error('Failed to update meal:', error);
      toast.error('Failed to update meal');
    }
  };

  const handleChangePlannedSlot = async (date: string, oldSlot: MealSlot, newSlot: MealSlot) => {
    try {
      await changePlannedMealSlot(date, oldSlot, newSlot);
      refetchWeekPlan();
      toast.success(`Moved to ${newSlot}!`);
    } catch (error: any) {
      console.error('Failed to change slot:', error);
      toast.error('Failed to change slot');
    }
  };

  const handleRemovePlannedMeal = async (date: string, slot: MealSlot) => {
    try {
      await deletePlannedMeal(date, slot);
      refetchWeekPlan();
      toast.success('Meal removed!');
    } catch (error: any) {
      console.error('Failed to remove meal:', error);
      toast.error('Failed to remove meal');
    }
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      <div className="grid grid-cols-12 gap-6">
      {/* LEFT SIDEBAR */}
      <div className="col-span-4 space-y-6">
        {/* Saved Meals */}
        <div className="rounded-xl border bg-white p-4 shadow-lg">
          <div className="font-bold mb-3">Saved Meals</div>

          {/* Meal Type Filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {['all', 'breakfast', 'lunch', 'dinner'].map((type) => (
              <button
                key={type}
                onClick={() => setMealTypeFilter(type as typeof mealTypeFilter)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  mealTypeFilter === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
            {filteredSavedMeals.map((m) => {
              const favorited = isFavorite(m.id);
              const isMealFamilyFave = isFamilyFave(m.id);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 hover:bg-gray-50 group"
                >
                  <div
                    className="flex items-center gap-2 flex-grow cursor-grab select-none"
                    draggable
                    aria-grabbed="false"
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'copy';
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({ type: 'saved-meal', id: m.id, name: m.name, emoji: m.emoji ?? null })
                      );
                      e.dataTransfer.setData('application/x-meal-id', m.id);
                      e.dataTransfer.setData('text/plain', m.id);
                      e.currentTarget.classList.add('opacity-70');
                      e.currentTarget.setAttribute('aria-grabbed', 'true');
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.classList.remove('opacity-70');
                      e.currentTarget.setAttribute('aria-grabbed', 'false');
                    }}
                    title="Drag to a Breakfast/Lunch/Dinner cell"
                  >
                    <span className="text-xl">{m.emoji ?? '🍽️'}</span>
                    <div className="flex-grow">
                      <div className="text-sm font-medium">{m.name}</div>
                      {isMealFamilyFave && (
                        <span className="inline-block text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold mt-0.5">
                          Family Fave
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(m.id);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Heart
                          size={16}
                          className={`transition-all ${
                            favorited
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-400'
                          }`}
                        />
                      </motion.div>
                    </button>
                    {isParentMode && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMeal(m);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit meal"
                        >
                          <Plus size={16} className="rotate-45" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeal(m.id, m.name)}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete meal"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {isParentMode && (
            <button
              onClick={() => setShowAddMealModal(true)}
              className="w-full mt-3 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              + Add New Meal
            </button>
          )}
        </div>

        {/* Freezer */}
        <div className="rounded-xl border bg-white p-4 shadow-lg">
          <div className="font-bold mb-3">Freezer</div>
          <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
            {freezerItems.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 hover:bg-gray-50 group"
              >
                <div
                  className="flex items-center gap-2 flex-grow cursor-grab select-none"
                  draggable
                  aria-grabbed="false"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({ type: 'freezer', id: f.id, name: f.name, emoji: f.emoji ?? null })
                    );
                    e.dataTransfer.setData('application/x-meal-id', f.id);
                    e.dataTransfer.setData('text/plain', f.id);
                    e.currentTarget.classList.add('opacity-70');
                    e.currentTarget.setAttribute('aria-grabbed', 'true');
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove('opacity-70');
                    e.currentTarget.setAttribute('aria-grabbed', 'false');
                  }}
                  title="Drag to a Breakfast/Lunch/Dinner cell"
                >
                  <span className="text-xl">{f.emoji ?? '🧊'}</span>
                  <div>
                    <div className="text-sm font-medium leading-tight">{f.name}</div>
                    <div className="text-[11px] text-gray-500">Qty: {f.quantity}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded bg-gray-200 px-2 py-1 text-xs"
                    onClick={() => adjustQty(f.id, -1)}
                    title="Decrease"
                  >
                    –
                  </button>
                  <button
                    className="rounded bg-gray-200 px-2 py-1 text-xs"
                    onClick={() => adjustQty(f.id, 1)}
                    title="Increase"
                  >
                    +
                  </button>
                  {isParentMode && (
                    <button 
                      onClick={() => handleDeleteFreezerItem(f.id, f.name)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete item"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {isParentMode && (
            <button
              onClick={() => setShowAddFreezerModal(true)}
              className="w-full mt-3 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
            >
              + Add Freezer Item
            </button>
          )}
        </div>
      </div>

      {/* WEEK GRID */}
      <div className="col-span-8 space-y-6">
        {/* Meal Quest Card */}
        <MealQuestCard
          challenge={challenge}
          loading={questLoading}
          isParentMode={isParentMode}
        />

        {/* Suggestions Carousel */}
        <SuggestionsCarousel
          onAddMeal={handleAddMealFromSuggestion}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
          getFavoriteCount={getFavoriteCount}
        />

        <div className="rounded-xl border bg-white p-4 shadow-lg">
        {/* Week Navigation Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
          <button
            onClick={handlePreviousWeek}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800 text-center">
              {currentWeek.format('MMM D')} - {weekEndDate.format('MMM D, YYYY')}
            </h2>
            <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
              Week {weekNumber}
            </span>
          </div>
          <button
            onClick={handleNextWeek}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            title="Next Week"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {isParentMode && (
          <div className="flex gap-2 mb-1">
            <button
              onClick={handleCopyLastWeek}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              Copy Last Week
            </button>
            <button
              onClick={handleClearWeek}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
            >
              Clear Week
            </button>
          </div>
        )}

        <div className="grid grid-cols-7 sm:grid-cols-7 gap-x-4 gap-y-4">
          {weekDays.map((day) => {
            const dateISO = day.format('YYYY-MM-DD');
            const dayPlan = plannedMealsByDate[dateISO] ?? {};
            const isLastDay = day.day() === 0;
            return (
              <div key={dateISO} className={`relative space-y-3 ${!isLastDay ? 'after:absolute after:top-0 after:right-[-8px] after:h-full after:w-px after:bg-gray-100' : ''}`}>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-800">{day.format('ddd')}</div>
                  <div className="text-xs text-gray-500">{day.format('MMM D')}</div>
                </div>

                {/* Breakfast cell */}
                <div
                  role="button"
                  data-date={dateISO}
                  data-slot="breakfast"
                  className="min-h-[110px] md:min-h-[130px] rounded-xl border border-sky-100 bg-sky-50 shadow-sm p-3 sm:p-4 hover:shadow-md transition cursor-pointer relative group z-10"
                  onDragOver={allowDrop}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={(e) => {
                    if (dayPlan.breakfast && isParentMode) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPlannedMealPopover({
                        date: dateISO,
                        slot: 'breakfast',
                        meal: dayPlan.breakfast,
                        position: { top: rect.bottom + 5, left: rect.left }
                      });
                    } else if (!dayPlan.breakfast) {
                      setMealPickerTarget({ date: dateISO, slot: 'breakfast', dateLabel: day.format('ddd, MMM D') });
                    }
                  }}
                >
                  <div className="text-[11px] tracking-wide text-gray-500 font-semibold mb-2">BREAKFAST</div>
                  {dayPlan.breakfast ? (
                    <>
                      <div className="flex flex-col items-center text-center">
                        <span className="text-2xl leading-none">{dayPlan.breakfast.meal_emoji || '🥣'}</span>
                        <span className="mt-1 text-sm font-medium text-gray-800 line-clamp-2">{dayPlan.breakfast.meal_name}</span>
                        <div className="flex flex-wrap gap-1 justify-center mt-1">
                          {dayPlan.breakfast.saved_meal_id && isFamilyFave(dayPlan.breakfast.saved_meal_id) && (
                            <span className="inline-block text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                              Family Fave
                            </span>
                          )}
                          {dayPlan.breakfast.saved_meal_id && isBackInRotation(dayPlan.breakfast.saved_meal_id, weekStart) && (
                            <span className="inline-block text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                              Back in rotation
                            </span>
                          )}
                        </div>
                      </div>
                      {dayPlan.breakfast.saved_meal_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(dayPlan.breakfast.saved_meal_id);
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Heart
                            size={14}
                            className={`transition-all ${
                              isFavorite(dayPlan.breakfast.saved_meal_id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                      <span className="text-2xl">🥣</span>
                      <span className="text-xs mt-1">Add meal</span>
                    </div>
                  )}
                </div>

                {/* Lunch cell */}
                <div
                  role="button"
                  data-date={dateISO}
                  data-slot="lunch"
                  className="min-h-[120px] md:min-h-[140px] rounded-xl border border-yellow-100 bg-yellow-50 shadow-sm p-3 sm:p-4 hover:shadow-md transition cursor-pointer relative group z-10"
                  onDragOver={allowDrop}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={(e) => {
                    if (dayPlan.lunch && isParentMode) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPlannedMealPopover({
                        date: dateISO,
                        slot: 'lunch',
                        meal: dayPlan.lunch,
                        position: { top: rect.bottom + 5, left: rect.left }
                      });
                    } else if (!dayPlan.lunch) {
                      setMealPickerTarget({ date: dateISO, slot: 'lunch', dateLabel: day.format('ddd, MMM D') });
                    }
                  }}
                >
                  <div className="text-[11px] tracking-wide text-gray-500 font-semibold mb-2">LUNCH</div>
                  {dayPlan.lunch ? (
                    <>
                      <div className="flex flex-col items-center text-center">
                        <span className="text-2xl leading-none">{dayPlan.lunch.meal_emoji || '🍲'}</span>
                        <span className="mt-1 text-sm font-medium text-gray-800 line-clamp-2">{dayPlan.lunch.meal_name}</span>
                        <div className="flex flex-wrap gap-1 justify-center mt-1">
                          {dayPlan.lunch.saved_meal_id && isFamilyFave(dayPlan.lunch.saved_meal_id) && (
                            <span className="inline-block text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                              Family Fave
                            </span>
                          )}
                          {dayPlan.lunch.saved_meal_id && isBackInRotation(dayPlan.lunch.saved_meal_id, weekStart) && (
                            <span className="inline-block text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                              Back in rotation
                            </span>
                          )}
                        </div>
                      </div>
                      {dayPlan.lunch.saved_meal_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(dayPlan.lunch.saved_meal_id);
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Heart
                            size={14}
                            className={`transition-all ${
                              isFavorite(dayPlan.lunch.saved_meal_id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                      <span className="text-2xl">🍽️</span>
                      <span className="text-xs mt-1">Add meal</span>
                    </div>
                  )}
                </div>

                {/* Dinner cell */}
                <div
                  role="button"
                  data-date={dateISO}
                  data-slot="dinner"
                  className="min-h-[120px] md:min-h-[140px] rounded-xl border border-orange-100 bg-orange-50 shadow-sm p-3 sm:p-4 hover:shadow-md transition cursor-pointer relative group z-10"
                  onDragOver={allowDrop}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={(e) => {
                    if (dayPlan.dinner && isParentMode) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPlannedMealPopover({
                        date: dateISO,
                        slot: 'dinner',
                        meal: dayPlan.dinner,
                        position: { top: rect.bottom + 5, left: rect.left }
                      });
                    } else if (!dayPlan.dinner) {
                      setMealPickerTarget({ date: dateISO, slot: 'dinner', dateLabel: day.format('ddd, MMM D') });
                    }
                  }}
                >
                  <div className="text-[11px] tracking-wide text-gray-500 font-semibold mb-2">DINNER</div>
                  {dayPlan.dinner ? (
                    <>
                      <div className="flex flex-col items-center text-center">
                        <span className="text-2xl leading-none">{dayPlan.dinner.meal_emoji || '🍲'}</span>
                        <span className="mt-1 text-sm font-medium text-gray-800 line-clamp-2">{dayPlan.dinner.meal_name}</span>
                        <div className="flex flex-wrap gap-1 justify-center mt-1">
                          {dayPlan.dinner.saved_meal_id && isFamilyFave(dayPlan.dinner.saved_meal_id) && (
                            <span className="inline-block text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                              Family Fave
                            </span>
                          )}
                          {dayPlan.dinner.saved_meal_id && isBackInRotation(dayPlan.dinner.saved_meal_id, weekStart) && (
                            <span className="inline-block text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                              Back in rotation
                            </span>
                          )}
                        </div>
                      </div>
                      {dayPlan.dinner.saved_meal_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(dayPlan.dinner.saved_meal_id);
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Heart
                            size={14}
                            className={`transition-all ${
                              isFavorite(dayPlan.dinner.saved_meal_id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                      <span className="text-2xl">🍽️</span>
                      <span className="text-xs mt-1">Add meal</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Slot Picker Modal */}
      <AnimatePresence>
        {showSlotPicker && pendingMeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowSlotPicker(false);
              setPendingMeal(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Add {pendingMeal.emoji} {pendingMeal.name}
                </h2>
                <button
                  onClick={() => {
                    setShowSlotPicker(false);
                    setPendingMeal(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  const dateISO = day.format('YYYY-MM-DD');
                  return (
                    <div key={dateISO} className="space-y-2">
                      <div className="text-center text-xs font-semibold text-gray-700">
                        {day.format('ddd')}
                        <div className="text-[10px] text-gray-500">{day.format('MMM D')}</div>
                      </div>

                      <button
                        onClick={() => handleSlotSelect(dateISO, 'breakfast')}
                        className="w-full rounded-lg border border-sky-200 bg-sky-50 p-2 text-center text-xs hover:bg-sky-100 transition-colors"
                      >
                        BREAKFAST
                      </button>

                      <button
                        onClick={() => handleSlotSelect(dateISO, 'lunch')}
                        className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-center text-xs hover:bg-yellow-100 transition-colors"
                      >
                        LUNCH
                      </button>

                      <button
                        onClick={() => handleSlotSelect(dateISO, 'dinner')}
                        className="w-full rounded-lg border border-orange-200 bg-orange-50 p-2 text-center text-xs hover:bg-orange-100 transition-colors"
                      >
                        DINNER
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Meal Modal */}
      <AnimatePresence>
        {showAddMealModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAddMealModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add New Meal</h2>
                <button
                  onClick={() => setShowAddMealModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meal Name</label>
                  <input
                    type="text"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                    placeholder="e.g., Spaghetti Bolognese"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                  <EmojiPicker 
                    value={newMeal.emoji}
                    onChange={(emoji) => setNewMeal({ ...newMeal, emoji })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={newMeal.notes}
                    onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                    placeholder="Any special notes about this meal..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddMealModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMeal}
                  disabled={!newMeal.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Meal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Freezer Item Modal */}
      <AnimatePresence>
        {showAddFreezerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAddFreezerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add Freezer Item</h2>
                <button
                  onClick={() => setShowAddFreezerModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                  <input
                    type="text"
                    value={newFreezerItem.name}
                    onChange={(e) => setNewFreezerItem({ ...newFreezerItem, name: e.target.value })}
                    placeholder="e.g., Frozen Pizza"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newFreezerItem.quantity}
                    onChange={(e) => setNewFreezerItem({ ...newFreezerItem, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                   <EmojiPicker 
                    value={newFreezerItem.emoji}
                    onChange={(emoji) => setNewFreezerItem({ ...newFreezerItem, emoji })}
                    variant="meals"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddFreezerModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFreezerItem}
                  disabled={!newFreezerItem.name.trim()}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Item
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Saved Meal Dialog */}
      {editingMeal && (
        <EditSavedMealDialog
          meal={editingMeal}
          isOpen={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onSave={handleSaveEditedMeal}
        />
      )}

      {/* Meal Picker Modal (click-to-assign) */}
      {mealPickerTarget && (
        <MealPickerModal
          isOpen={!!mealPickerTarget}
          onClose={() => setMealPickerTarget(null)}
          date={mealPickerTarget.date}
          slot={mealPickerTarget.slot}
          dateLabel={mealPickerTarget.dateLabel}
          savedMeals={savedMeals}
          freezerItems={freezerItems}
          isFavorite={isFavorite}
          onSelect={handleMealPickerSelect}
        />
      )}

      {/* Planned Meal Popover */}
      {plannedMealPopover && (
        <PlannedMealPopover
          date={plannedMealPopover.date}
          currentSlot={plannedMealPopover.slot}
          mealName={plannedMealPopover.meal.meal_name}
          isOpen={!!plannedMealPopover}
          onClose={() => setPlannedMealPopover(null)}
          onChangeSlot={(newSlot) => {
            handleChangePlannedSlot(plannedMealPopover.date, plannedMealPopover.slot, newSlot);
          }}
          onRemove={() => {
            handleRemovePlannedMeal(plannedMealPopover.date, plannedMealPopover.slot);
          }}
          position={plannedMealPopover.position}
        />
      )}
      </div>
    </>
  );
};