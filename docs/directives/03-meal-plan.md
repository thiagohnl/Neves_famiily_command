# 03 - Meal Plan

## Purpose

The Meal Plan tab provides a complete meal management system with four features: a library of saved meals, a freezer inventory tracker, a weekly meal planner, and a favorites system. It also includes gamification through a "Meal Quest" feature.

## How It Works

### Sub-tabs / Sections

The MealPlan component combines multiple data sources and UI sections:

1. **Saved Meals** -- A library of meals the family cooks regularly.
2. **Freezer Tracker** -- Track what is in the freezer with quantities.
3. **Weekly Meal Plan** -- Assign meals to days of the week (breakfast, lunch, dinner slots).
4. **Favorites** -- Star/heart meals to mark them as family favorites.
5. **Meal Quest** -- Gamification card for meal planning achievements.
6. **Suggestions Carousel** -- Meal suggestions based on saved meals.

### Saved Meals CRUD

**API:** `src/lib/mealsApi.ts`

| Function | Description |
|---|---|
| `listSavedMeals()` | Fetch all saved meals for `family_id = 'default'`, ordered by name |
| `createSavedMeal(input)` | Insert a new saved meal with name, emoji (default `'🍽️'`), notes, meal_types (default `['lunch', 'dinner']`) |
| `updateSavedMeal(id, input)` | Partial update of name, emoji, notes, meal_types |
| `deleteSavedMeal(id)` | Delete a saved meal by id |

**Hook:** `useSavedMeals()` from `src/hooks/useMeals.ts`

Returns: `{ items, loading, error, refetch, add, remove }`

- `add(name, emoji?, notes?)` creates a meal and inserts it sorted by name.
- `remove(id)` deletes the meal and removes it from local state.

### Freezer Tracking

**API:** `src/lib/mealsApi.ts`

| Function | Description |
|---|---|
| `listFreezer()` | Fetch all freezer items for `family_id = 'default'`, ordered by `created_at DESC` |
| `addFreezerItem(input)` | Insert with name, emoji (default `'🥶'`), notes, quantity (default `1`), unit (default `'meal'`), category, `in_stock: true` |
| `updateFreezerQty(id, delta)` | Adjust quantity by delta. `newQty = Math.max(0, current + delta)`. Sets `in_stock: newQty > 0` |
| `deleteFreezerItem(id)` | Delete a freezer item |

**Hook:** `useFreezerMeals()` from `src/hooks/useMeals.ts`

Returns: `{ items, loading, error, refetch, add, adjustQty, remove }`

- `adjustQty(id, delta)` increments or decrements the quantity. Quantity cannot go below 0.

### Weekly Meal Planning

**API:** `src/lib/mealsApi.ts`

Meal slots are typed as: `type MealSlot = 'breakfast' | 'lunch' | 'dinner'`

| Function | Description |
|---|---|
| `planMeal(date, slot, meal)` | Upsert a meal plan entry. Conflict resolution on `(date, meal_type)` composite key |
| `getPlannedWeek(startISO, endISO)` | Fetch all meal plans between two dates. Joins with `saved_meals` via `meal_id` FK |
| `deletePlannedMeal(date, slot)` | Delete a specific meal plan entry by date + meal_type |
| `changePlannedMealSlot(date, oldSlot, newSlot)` | Move a planned meal from one slot to another on the same date |
| `getTodayPlan(todayISO)` | Fetch today's planned meals (used by Board tab) |

**Hook:** `useWeekMealPlan(weekStartISO)` from `src/hooks/useMeals.ts`

Returns: `{ items, loading, error, refetch, plan }`

- `plan(dateISO, slot, meal)` calls `planMeal` and updates local state optimistically.
- Re-fetches when `weekStartISO` changes (week navigation).

**Upsert Logic:**

The `planMeal` function uses Supabase upsert with `onConflict: 'date,meal_type'`:

```ts
await supabase
  .from('meal_plans')
  .upsert(payload, { onConflict: 'date,meal_type' })
  .select()
  .single();
```

This means assigning a meal to a date+slot that already has a meal will **replace** it.

### Favorites System

**API:** `src/lib/mealsApi.ts`

| Function | Description |
|---|---|
| `toggleFavorite(mealId, isFavorited)` | If currently favorited, deletes from `meal_favorites`. If not, inserts into `meal_favorites` |
| `checkFavoritesTableExists()` | Safety check -- returns `true` if the `meal_favorites` table exists |

The `user_id` is hardcoded to `'family'` and `family_id` is hardcoded to `'default'` since there is no auth.

**Hook:** `useMealFavorites` from `src/hooks/useMealFavorites.ts`

### Meal Quest / Gamification

The `useMealQuest` hook (from `src/hooks/useMealQuest.ts`) provides gamification for meal planning. The `MealQuestCard` component renders quest progress.

### Suggestions Carousel

The `SuggestionsCarousel` component shows meal suggestions, likely based on the saved meals library and usage patterns.

### Today's Meals (Board Integration)

**Hook:** `useTodayMeal()` from `src/hooks/useMeals.ts`

Fetches today's planned meals and extracts `lunch` and `dinner` from the results. Used by the `TodaysMeals` sub-component on the Board tab.

```ts
const lunch = items.find((r) => r.slot === 'lunch') ?? null;
const dinner = items.find((r) => r.slot === 'dinner') ?? null;
```

### Planned Meal Data Shape

After fetching and mapping, each planned meal item has:

```ts
{
  id: string;
  date: string;          // 'YYYY-MM-DD'
  meal_type: string;     // 'breakfast' | 'lunch' | 'dinner'
  slot: MealSlot;
  saved_meal_id: string;
  meal_name: string;     // From joined saved_meals or 'Unknown Meal'
  meal_emoji: string;    // From meal_emoji column or saved_meals.emoji or '🍽️'
}
```

## Rules

- The Meal Plan tab does **not** require parent mode for viewing, but meal management actions may be gated.
- All meal data is scoped with `family_id = 'default'` -- there is only one family.
- Favorites use `user_id = 'family'` -- there is only one user context.
- The weekly planner uses upsert on `(date, meal_type)` composite key -- assigning to an occupied slot replaces the existing entry.
- Freezer quantities cannot go below 0: `Math.max(0, current + delta)`.
- When a freezer item reaches quantity 0, `in_stock` is set to `false`.
- Meal emoji defaults: saved meals use `'🍽️'`, freezer items use `'🥶'`.
- The planned week view joins `meal_plans` with `saved_meals` via the `meal_id` foreign key.
- The `EditSavedMealDialog` and `PlannedMealPopover` provide inline edit/action capabilities.
- Safe upsert for meal plans is available via `upsertMealPlanSafe` from `src/data/mealPlans.ts`.

## Edge Cases

- If `meal_id` references a deleted saved meal, `meal_name` falls back to `'Unknown Meal'` and emoji to `'🍽️'`.
- `changePlannedMealSlot` deletes the old slot entry and upserts into the new slot. If the old slot has no data, the function returns early.
- `checkFavoritesTableExists` is used to gracefully handle the case where the `meal_favorites` table might not exist yet.
- The week plan refetches whenever the `weekStartISO` prop changes due to navigation.

## Component Map

| Component | File | Role |
|---|---|---|
| `MealPlan` | `src/components/MealPlan.tsx` | Main meal plan page |
| `EditSavedMealDialog` | `src/components/EditSavedMealDialog.tsx` | Edit a saved meal |
| `PlannedMealPopover` | `src/components/PlannedMealPopover.tsx` | Actions on a planned meal |
| `SuggestionsCarousel` | `src/components/SuggestionsCarousel.tsx` | Meal suggestions |
| `MealQuestCard` | `src/components/MealQuestCard.tsx` | Meal quest gamification |
| `EmojiPicker` | `src/components/EmojiPicker.tsx` | Emoji selection |
| `TodaysMeals` | (inline in TimelineChoreBoard.tsx) | Board tab meal display |

### Hooks Used

| Hook | Source | Data |
|---|---|---|
| `useSavedMeals` | `src/hooks/useMeals.ts` | Saved meals CRUD |
| `useFreezerMeals` | `src/hooks/useMeals.ts` | Freezer inventory CRUD |
| `useWeekMealPlan` | `src/hooks/useMeals.ts` | Weekly meal plan by week |
| `useTodayMeal` | `src/hooks/useMeals.ts` | Today's planned meals |
| `useMealFavorites` | `src/hooks/useMealFavorites.ts` | Meal favorites toggle |
| `useMealQuest` | `src/hooks/useMealQuest.ts` | Meal gamification |
