# 07 - Data Model

## Purpose

This document defines all Supabase tables, their columns and types, relationships, and RLS policies used by the Family Chore Board app. All tables use anonymous access with RLS policies that grant full access to the `anon` role.

## Supabase Client Configuration

```ts
// src/lib/supabase.ts
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
```

- No user sessions are persisted.
- All queries use the anonymous Supabase key.
- All RLS policies are configured to allow the `anon` role full SELECT, INSERT, UPDATE, DELETE access.

---

## Tables

### family_members

Stores family member profiles.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | -- | Member display name |
| `avatar` | text | No | -- | Emoji avatar |
| `photo_url` | text | Yes | `null` | URL to profile photo |
| `points` | integer | No | `0` | Accumulated chore points |
| `is_parent` | boolean | No | `false` | Whether member is a parent |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Used by:** `useChores` (fetched alongside chores), `EditFamilyMembers`, all tab components via props.

**TypeScript interface:**
```ts
interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  photo_url?: string;
  points: number;
  is_parent: boolean;
  created_at?: string;
}
```

---

### chores

Stores individual chore assignments.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | -- | Chore name |
| `assigned_to` | uuid | No | -- | FK to `family_members.id` |
| `points` | integer | No | `5` | Points awarded (5, 10, or 20) |
| `is_completed` | boolean | No | `false` | Completion status |
| `recurring_days` | text[] | Yes | `null` | Array of day names (e.g., `['Monday', 'Friday']`) |
| `emoji` | text | Yes | `null` | Display emoji |
| `scheduled_time` | time | Yes | `null` | Time of day (`'HH:mm'`) |
| `end_time` | time | Yes | `null` | End time (`'HH:mm'`) |
| `description` | text | Yes | `null` | Optional description |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `completed_at` | timestamptz | Yes | `null` | When completed |

**Used by:** `useChores`, `TimelineChoreBoard`, `ChoreManagement`.

**TypeScript interface:**
```ts
interface Chore {
  id: string;
  name: string;
  assigned_to: string;
  assigned_member_name?: string;
  points: number;
  is_completed: boolean;
  recurring_days?: string[];
  emoji?: string;
  scheduled_time?: string;
  end_time?: string;
  created_at?: string;
  completed_at?: string;
  description?: string;
}
```

---

### app_settings

Stores application configuration. Single-row table with `id = 'default'`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | text | No | `'default'` | Primary key (always `'default'`) |
| `title` | text | No | `'Family Chore Board'` | App header title |
| `theme` | text | No | `'light'` | Theme: `'light'`, `'dark'`, or `'kids'` |
| `email_summaries` | boolean | No | `false` | Weekly email toggle |
| `parent_pin` | text | Yes | `'1234'` | Parent mode PIN (plain text) |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | Yes | `null` | Last update timestamp |

**Used by:** `useAppSettings` (via `dataGateway`), `useParentAuth`, `SettingsModal`.

**TypeScript interface:**
```ts
interface AppSettings {
  id: string;
  title: string;
  theme: 'light' | 'dark' | 'kids';
  email_summaries: boolean;
  parent_pin?: string;
  created_at?: string;
  updated_at?: string;
}
```

---

### saved_meals

Library of meals the family prepares.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `family_id` | text | No | `'default'` | Family scope identifier |
| `name` | text | No | -- | Meal name |
| `emoji` | text | Yes | `'🍽️'` | Display emoji |
| `notes` | text | Yes | `null` | Optional notes |
| `meal_types` | text[] | Yes | `['lunch', 'dinner']` | Which slots this meal fits |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Used by:** `mealsApi.ts` (listSavedMeals, createSavedMeal, updateSavedMeal, deleteSavedMeal), `useSavedMeals`.

---

### freezer_meals

Tracks items stored in the freezer.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `family_id` | text | No | `'default'` | Family scope identifier |
| `name` | text | No | -- | Item name |
| `emoji` | text | Yes | `'🥶'` | Display emoji |
| `notes` | text | Yes | `null` | Optional notes |
| `quantity` | integer | No | `1` | Number of servings/portions |
| `unit` | text | Yes | `'meal'` | Unit of measurement |
| `category` | text | Yes | `null` | Item category |
| `in_stock` | boolean | No | `true` | Whether quantity > 0 |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Used by:** `mealsApi.ts` (listFreezer, addFreezerItem, updateFreezerQty, deleteFreezerItem), `useFreezerMeals`.

---

### meal_plans

Weekly meal assignments. Uses a composite unique constraint on `(date, meal_type)` for upsert.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `date` | date | No | -- | Plan date (`'YYYY-MM-DD'`) |
| `meal_type` | text | No | -- | Slot: `'breakfast'`, `'lunch'`, or `'dinner'` |
| `meal_id` | uuid | Yes | `null` | FK to `saved_meals.id` |
| `meal_emoji` | text | Yes | `null` | Override emoji (if different from saved meal) |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Unique constraint:** `(date, meal_type)` -- used for upsert conflict resolution.

**Foreign key:** `meal_id` references `saved_meals.id`.

**Used by:** `mealsApi.ts` (planMeal, getPlannedWeek, getTodayPlan, deletePlannedMeal, changePlannedMealSlot), `useWeekMealPlan`, `useTodayMeal`.

**Join query example:**
```ts
.select('id, date, meal_type, meal_id, meal_emoji, saved_meals:meal_id(id,name,emoji)')
```

---

### meal_favorites

Tracks favourite meals per user. Since there is no auth, `user_id` is hardcoded to `'family'`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `meal_id` | uuid | No | -- | FK to `saved_meals.id` |
| `user_id` | text | No | `'family'` | Hardcoded user identifier |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Used by:** `mealsApi.ts` (toggleFavorite, checkFavoritesTableExists), `useMealFavorites`.

---

### schedule_events

Stores schedule events (one-time and recurring).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `title` | text | No | -- | Event title |
| `date` | date | Yes | `null` | Specific date (null for recurring) |
| `start_time` | time | No | -- | Start time (`'HH:mm'`) |
| `end_time` | time | No | -- | End time (`'HH:mm'`) |
| `assigned_member_ids` | uuid[] | No | `'{}'` | Array of FK to `family_members.id` |
| `is_recurring` | boolean | No | `false` | Whether event repeats weekly |
| `recurring_days` | text[] | Yes | `'{}'` | Day names (e.g., `['Monday', 'Wednesday']`) |
| `color` | text | No | `'#8B5CF6'` | Display colour (hex) |
| `notes` | text | Yes | `null` | Optional notes |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Used by:** `Schedule` component (direct Supabase queries), `TodaysScheduleCard`.

---

### fun_ideas

Stores family activity ideas and bucket list items.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | -- | Idea name |
| `category` | text | Yes | `null` | Category (e.g., 'Outdoor', 'Indoor') |
| `notes` | text | Yes | `null` | Optional notes |
| `emoji` | text | Yes | `'🎯'` | Display emoji |
| `location` | text | Yes | `null` | Location description |
| `cost` | text | Yes | `'Free'` | Cost tier |
| `google_maps_link` | text | Yes | `null` | Google Maps URL |
| `is_favorite` | boolean | Yes | `false` | Favourite flag |
| `scheduled_date` | date | Yes | `null` | When the idea is scheduled |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Used by:** `useFunIdeas`, `FunIdeas` component.

---

### activities

Stores reusable activity definitions (used by planned activities and the Board timeline).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | -- | Activity name |
| `category` | text | No | -- | Activity category |
| `emoji` | text | No | -- | Display emoji |
| `start_time` | time | Yes | `null` | Start time (`'HH:mm'`) |
| `end_time` | time | Yes | `null` | End time (`'HH:mm'`) |
| `recurring_days` | text[] | Yes | `null` | Day names for weekly recurrence |
| `assigned_member_ids` | uuid[] | Yes | `null` | Array of FK to `family_members.id` |
| `color` | text | Yes | `null` | Display colour |

**Used by:** `useActivities`, `TimelineChoreBoard` (for timeline positioning).

**TypeScript interface:**
```ts
interface Activity {
  id: string;
  name: string;
  category: string;
  emoji: string;
  start_time?: string;
  end_time?: string;
  recurring_days?: string[];
  assigned_member_ids?: string[];
  color?: string;
}
```

---

### planned_activities

Join table for scheduling specific activities on specific dates for specific members.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `activity_id` | uuid | No | -- | FK to `activities.id` |
| `date` | date | No | -- | Scheduled date |
| `member_id` | uuid | No | -- | FK to `family_members.id` |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Foreign keys:** `activity_id` references `activities.id`, `member_id` references `family_members.id`.

**Join query:**
```ts
.select(`*, activity:activities(*)`)
```

**Used by:** `useActivities`, `TimelineChoreBoard`.

**TypeScript interface:**
```ts
interface PlannedActivity {
  id: string;
  activity_id: string;
  date: string;
  member_id: string;
  activity: Activity;
}
```

---

## RPC Functions

### increment_points

A Supabase RPC (database function) that atomically increments a family member's points.

**Signature:**
```sql
increment_points(member_id uuid, points_to_add integer)
```

**Called from:**
```ts
await supabase.rpc('increment_points', {
  member_id: assignedTo,
  points_to_add: points,
});
```

**Used in:**
- `useChores.completeChore` -- when completing a chore from the Board tab.
- `ChoreManagement.completeChore` -- when completing a chore from the Chores tab.

**Behaviour:** Atomically adds `points_to_add` to the `points` column of the `family_members` row with the given `member_id`. Using an RPC ensures the increment is atomic and avoids race conditions from concurrent completions.

---

## RLS Policies

All tables have Row Level Security enabled with policies that allow the `anon` role full access:

```sql
-- Example policy (applied to each table)
CREATE POLICY "Allow anonymous access" ON table_name
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

This means:
- No authentication is required for any operation.
- Any client with the anon key can SELECT, INSERT, UPDATE, DELETE on all tables.
- Security is handled at the application level via the parent PIN mechanism.

---

## Entity Relationships

```
family_members
  |-- (1:N) --> chores.assigned_to
  |-- (M:N) --> schedule_events.assigned_member_ids (array)
  |-- (M:N) --> activities.assigned_member_ids (array)
  |-- (1:N) --> planned_activities.member_id

saved_meals
  |-- (1:N) --> meal_plans.meal_id
  |-- (1:N) --> meal_favorites.meal_id

activities
  |-- (1:N) --> planned_activities.activity_id

app_settings (singleton, id='default')
```

## Rules

- All primary keys are UUIDs generated by Postgres `gen_random_uuid()`.
- All tables have a `created_at` timestamp defaulting to `now()`.
- The `family_id` field in `saved_meals` and `freezer_meals` is always `'default'` (single-family app).
- The `user_id` field in `meal_favorites` is always `'family'` (no individual user tracking).
- Array columns (`recurring_days`, `assigned_member_ids`, `meal_types`) store text/uuid arrays in Postgres.
- The `meal_plans` table uses `(date, meal_type)` as a composite unique constraint for upsert operations.
- Foreign keys exist between `meal_plans.meal_id -> saved_meals.id` and `planned_activities.activity_id -> activities.id`.

## Edge Cases

- Deleting a `saved_meal` that is referenced by `meal_plans` rows may cause the join to return `null` for the meal name (the app falls back to `'Unknown Meal'`).
- Deleting a `family_member` that is referenced by `chores.assigned_to` will leave orphaned chore rows.
- The `schedule_events.assigned_member_ids` is a Postgres array, not a join table. This means cascading deletes of members do not automatically clean up event assignments.
- `app_settings` is expected to have exactly one row with `id = 'default'`. The `dataGateway.getAppSettings` query uses `ORDER BY updated_at DESC LIMIT 1` as a safety measure.
- The `increment_points` RPC function should handle the case where `member_id` does not exist (behaviour depends on the SQL implementation).
