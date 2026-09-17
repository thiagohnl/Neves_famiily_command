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

### Recipes

Any saved meal can carry a recipe (ingredients, steps, servings, times, dish photo, source link).

- **Editing:** `EditSavedMealDialog` has **Details** and **Recipe** tabs. In create mode (no `meal` prop, opened from "📥 Import Recipe") it starts on the Recipe tab and calls `createSavedMeal`.
- **Importing:** the Recipe tab sends a link, 1-4 photos/screenshots, or pasted text to `api/import-recipe.ts` (via `src/lib/recipeApi.ts`). The endpoint reads schema.org `Recipe` JSON-LD when a page has it, otherwise page meta + text, and asks Claude for schema-constrained JSON. Instagram/TikTok links are best effort — Instagram usually serves a login wall, so the endpoint returns `422 { fallback: 'paste_or_screenshot' }` and the dialog opens the paste box. Link preview images are returned as base64 and re-uploaded, because social CDN URLs expire.
- **Photos:** `uploadRecipePhoto(blob, key)` compresses to 1200px JPEG and stores it in the public `recipe-photos` bucket.
- **Viewing:** `RecipeViewModal` (portal, near full-screen, keeps the screen awake) opens from the 📖 button on saved meals, planned meal cells, the planned meal popover ("View recipe"), and the Board's Meal of the Day card. It scales quantities by servings, shows pantry status per ingredient, adds missing ingredients to the grocery list (skipping ones already on it), and runs Cooked It.
- **Pantry matching:** `src/lib/recipeMatching.ts` is pure and unit-tested: name normalization (accents, plurals), exact-then-containment matching, g/kg and ml/L conversion. Incompatible units (tbsp vs bottle) count as "have" with no automatic deduction amount.
- **Cooked It:** when the meal has saved ingredients, `CookedMealModal` builds deductions from the recipe with no AI call; rows whose units can't be converted start at 0 with a "set amount used" hint. Meals without a recipe keep the AI estimate (`api/cook-meal.ts`).

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
| `EditSavedMealDialog` | `src/components/EditSavedMealDialog.tsx` | Create/edit a saved meal and its recipe (with AI import) |
| `RecipeViewModal` | `src/components/RecipeViewModal.tsx` | Tablet recipe view: scaling, pantry status, grocery list, Cooked It |
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
