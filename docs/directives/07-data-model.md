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
| `gender` | text | Yes | `null` | Optional gender |
| `birth_date` | date | Yes | `null` | Date of birth; drives the birthday season |
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
  gender?: string | null;
  birth_date?: string | null;
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
| `board_layout` | text | No | `'home'` | Board tab layout: `'home'` or `'timeline'`; check `IN ('timeline','home')`. The app treats a missing value as `'home'`. |
| `language` | text | No | `'en'` | Language of season strings; check `IN ('en','pt','nl')`. The rest of the app stays English. |
| `active_season` | text | Yes | `null` | Manual season override: `'sinterklaas'`, `'christmas'` or `'none'` (force no season). `null` = automatic by date. No DB check, so new season keys need no migration; unknown values are treated as auto. |
| `season_dates` | jsonb | No | `'{}'` | Per-year season dates (see below) |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | Yes | `null` | Last update timestamp |

**Migrations:** `20261020120000_add_season_settings.sql` adds `language`, `active_season`, `season_dates`; `20261021120000_add_board_layout_setting.sql` adds `board_layout`.

**`season_dates` shape** (all dates `YYYY-MM-DD`, every key optional; edited in Settings → Seasons):
```json
{
  "sinterklaas": {
    "intocht": "2026-11-14",
    "intocht_local": "2026-11-15",
    "pakjesavond": "2026-12-05",
    "shoe_nights": ["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"],
    "journaal_start": "2026-11-09"
  }
}
```
Sinterklaas only runs automatically when both `journaal_start` and `pakjesavond` are set. Christmas (6–26 Dec) needs no dates. Birthdays come from `family_members.birth_date`.

**Used by:** `useAppSettings` (via `dataGateway`), `useParentAuth`, `SettingsModal`, `useSeasonSource` (season engine in `src/seasons/`).

**TypeScript interface:**
```ts
type Language = 'en' | 'pt' | 'nl';

interface SinterklaasDates {
  intocht?: string;
  intocht_local?: string;
  pakjesavond?: string;
  shoe_nights?: string[];
  journaal_start?: string;
}

interface SeasonDates {
  sinterklaas?: SinterklaasDates;
}

interface AppSettings {
  id: string;
  title: string;
  theme: 'light' | 'dark' | 'kids';
  email_summaries: boolean;
  board_layout?: 'timeline' | 'home';
  language?: Language;
  active_season?: string | null;
  season_dates?: SeasonDates;
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
| `ingredients` | jsonb | Yes | `[]` | Recipe ingredients: `RecipeIngredient[]` (see below) |
| `steps` | jsonb | Yes | `[]` | Recipe method, array of strings in the source language |
| `servings` | int | Yes | `null` | Servings the recipe makes (base for scaling) |
| `prep_minutes` | int | Yes | `null` | Prep time |
| `cook_minutes` | int | Yes | `null` | Cook time |
| `recipe_source_url` | text | Yes | `null` | Where the recipe came from (blog, Instagram post...) |
| `recipe_image_url` | text | Yes | `null` | Public URL of the dish photo in the `recipe-photos` bucket |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

`RecipeIngredient` (`src/types/recipe.ts`): `{ text, name, quantity, unit, emoji, category, staple? }`. `text` is the original line in the recipe's language; `name` is a generic English pantry-style name used to match pantry and grocery items; `staple` marks salt/pepper/water-type items that are skipped for shopping and pantry deduction.

**Used by:** `mealsApi.ts` (listSavedMeals, getSavedMeal, createSavedMeal, updateSavedMeal, deleteSavedMeal, uploadRecipePhoto), `useSavedMeals`, `EditSavedMealDialog`, `RecipeViewModal`, `CookedMealModal`.

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

**Used by:** `Schedule` component (direct Supabase queries), `useScheduleEvents` (via `dataGateway.listScheduleEvents`) for `TodaysScheduleCard` and the Board's Today list.

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

### whereabouts_overrides

Where a family member is, set by hand on the board (`manual`) or by a phone through `/api/presence` (`presence`). Wins over calendar inference until it expires. Migration `20261022120000_create_whereabouts_tables.sql`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `member_id` | uuid | No | -- | FK to `family_members.id` (`ON DELETE CASCADE`), indexed |
| `status` | text | No | -- | `home`, `school`, `work`, `church`, `grandma`, `playdate`, `travelling`, `sleeping` (check) |
| `source` | text | No | -- | `manual` or `presence` (check); manual beats presence |
| `set_at` | timestamptz | No | `now()` | When it was set; newest wins within a source |
| `expires_at` | timestamptz | Yes | `null` | Ignored after this time; null = until replaced or cleared |

- At most one row per member and source by convention: the board replaces the member's `manual` row (4 h expiry), the presence endpoint replaces the `presence` row (default 180 min).
- The table is in the `supabase_realtime` publication; the board subscribes to it.

**Used by:** `src/lib/whereaboutsApi.ts` (`listActiveOverrides`, `setManualOverride`, `subscribeToOverrides`), `useWhereabouts`, `api/presence.ts`.

---

### whereabouts_rules

Calendar title keyword → status, used when no override is active. Same migration.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `member_id` | uuid | Yes | `null` | FK to `family_members.id` (`ON DELETE CASCADE`), indexed; null = applies to any member |
| `keyword` | text | No | -- | Whole-word, case-insensitive match against the Today item title (may be several words, e.g. "Zaandam office") |
| `status` | text | No | -- | Same values as `whereabouts_overrides.status` (check) |
| `priority` | int | No | `0` | Highest wins when several rules match |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**Seeded rules** (all members):
- **School:** school, escola → `school`; also daycare, creche, crèche, kinderopvang, opvang, BSO (migration `20261023120000_add_whereabouts_rule_keywords.sql`)
- **Playdate:** playdate → `playdate`
- **Church:** church, igreja, kerk → `church`
- **Work:** work, office → `work`
- **Working from home:** WFH, home office, thuiswerken → `home`, priority 10 so they beat "work"/"office"
- **Grandma:** vovó, vovo, grandma → `grandma`
- **Travelling:** travel, flight, train → `travelling`

Add member-specific rows for personal places, e.g. `(Thiago's id, 'Zaandam office', 'work')`. There is no editing UI yet; add rows in the Supabase table editor.

**Used by:** `listRules` in `src/lib/whereaboutsApi.ts`, `useWhereabouts`.

**TypeScript interfaces** (`src/lib/whereabouts.ts`):
```ts
interface WhereaboutsOverride {
  id: string;
  member_id: string;
  status: Whereabout;
  source: 'manual' | 'presence';
  set_at: string;
  expires_at: string | null;
}

interface WhereaboutsRule {
  id: string;
  member_id: string | null;
  keyword: string;
  status: Whereabout;
  priority: number;
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
  |-- (1:N) --> whereabouts_overrides.member_id (cascade delete)
  |-- (1:N) --> whereabouts_rules.member_id (nullable, cascade delete)

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
