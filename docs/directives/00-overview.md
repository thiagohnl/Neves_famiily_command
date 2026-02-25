# 00 - App Overview

## Purpose

Family Chore Board is a household management app designed for families. It lets family members track chores on a visual timeline, plan weekly meals, manage a shared schedule, and collect fun activity ideas. There is no user authentication -- the app uses Supabase anonymous access with a simple parent PIN to gate administrative actions.

## Tech Stack

| Dependency | Version | Role |
|---|---|---|
| React | 18.3 | UI library |
| TypeScript | 5.5 | Type safety |
| Vite | 5.4 | Build tool and dev server |
| TailwindCSS | 3.4 | Utility-first CSS |
| @supabase/supabase-js | 2.52 | Backend-as-a-service (Postgres + REST) |
| framer-motion | 12.23 | Animations and transitions |
| dayjs | 1.11 | Date/time manipulation |
| react-hot-toast | 2.5 | Toast notifications |
| lucide-react | 0.344 | Icon library |
| react-confetti | 6.4 | Confetti celebration animation |

### Dev Dependencies

- `@vitejs/plugin-react` -- Vite React plugin
- `vitest` / `@testing-library/react` / `jsdom` -- Testing
- `autoprefixer`, `postcss` -- CSS processing
- `eslint`, `typescript-eslint` -- Linting

## Architecture Summary

```
src/
  App.tsx              # Root component, tab routing, header, modals
  types/index.ts       # Shared TypeScript interfaces
  lib/
    supabase.ts        # Supabase client (anon key, no session persistence)
    dataGateway.ts     # Abstraction layer for settings and members
    mealsApi.ts        # All meal-related Supabase queries
  hooks/
    useChores.ts       # Chore CRUD + completion + points RPC
    useAppSettings.ts  # App settings read/write via dataGateway
    useParentAuth.ts   # PIN-based parent mode auth
    useMeals.ts        # Hooks: useSavedMeals, useFreezerMeals, useWeekMealPlan, useTodayMeal
    useMealFavorites.ts# Meal favorites toggle
    useMealQuest.ts    # Meal gamification quest
    useFunIdeas.ts     # Fun ideas CRUD + favorites
    useActivities.ts   # Activities + planned activities CRUD
  components/
    TimelineChoreBoard.tsx  # Board tab -- timeline view
    ChoreManagement.tsx     # Chores tab -- CRUD management
    MealPlan.tsx            # Meal Plan tab -- saved meals, freezer, weekly plan
    Schedule.tsx            # Schedule tab -- weekly event calendar
    FunIdeas.tsx            # Fun Ideas tab -- activity bucket list
    SettingsModal.tsx       # Settings modal (title, theme, email, PIN)
    ParentAuthModal.tsx     # PIN entry modal
    ParentModeToggle.tsx    # Header toggle for parent mode
    EditFamilyMembers.tsx   # Family member management (parent only)
    ConfettiCelebration.tsx # Confetti + toast on chore completion
    EmojiPicker.tsx         # Reusable emoji picker
    TodaysScheduleCard.tsx  # Schedule summary card on Board
    SuggestionsCarousel.tsx # Meal suggestion carousel
    MealQuestCard.tsx       # Meal quest gamification card
    EditSavedMealDialog.tsx # Edit saved meal modal
    PlannedMealPopover.tsx  # Popover for planned meal actions
  data/
    mealPlans.ts        # Safe upsert helper for meal plans
  constants/
    chore_emojis.ts     # Emoji data and search for chore picker
  utils/
    useFocusTrap.ts     # Focus trap hook for modals (accessibility)
```

## Path Alias

The project uses a Vite path alias:

```
@/ --> ./src
```

Configured in `vite.config.ts`:

```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

Import example: `import { useSavedMeals } from '@/hooks/useMeals';`

## How It Works

1. `App.tsx` is the root component. It initialises three core hooks: `useChores`, `useAppSettings`, and `useParentAuth`.
2. Five tabs are rendered via a `currentTab` state variable of type `TabView = 'board' | 'chores' | 'meals' | 'schedule' | 'fun'`.
3. All tab components are lazy-loaded with `React.lazy()` and wrapped in `<Suspense>` for code splitting.
4. The header is sticky and contains: app title, parent mode toggle, online/offline indicator, settings button, edit members button (parent only), and refresh button.
5. The tab bar sits below the header, also sticky. Each tab has an emoji and label (label hidden on small screens).
6. Theme is applied by toggling `dark` or `kids-theme` CSS classes on `document.documentElement`.

## Rules

- All Supabase tables use anonymous access (no auth required). RLS policies allow the `anon` role full access.
- The Supabase client is created with `auth: { persistSession: false }` -- there are no user sessions.
- Parent mode is the only access control. It is a client-side PIN check stored in `localStorage` under the key `parentMode`.
- The app uses optimistic UI updates in settings and local state updates after Supabase mutations in hooks.
- Toast notifications (`react-hot-toast`) are used for all user feedback.
- All animations use `framer-motion` with `motion.div`, `AnimatePresence`, `whileHover`, and `whileTap`.

## Edge Cases

- If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` environment variables are missing, the app logs an error but still attempts to create the client (will fail on first query).
- Offline state is tracked via `navigator.onLine` and `online`/`offline` events, displayed as a Wi-Fi icon in the header. No offline data caching is implemented.
- If settings fail to load, the app uses default values: title "Family Chore Board", theme "light", email summaries off.
- The build uses manual chunks for `vendor` (react, react-dom), `supabase`, and `motion` (framer-motion).

## Component Map

| Tab | Component | File |
|---|---|---|
| Board | `TimelineChoreBoard` | `src/components/TimelineChoreBoard.tsx` |
| Chores | `ChoreManagement` | `src/components/ChoreManagement.tsx` |
| Meal Plan | `MealPlan` | `src/components/MealPlan.tsx` |
| Schedule | `Schedule` | `src/components/Schedule.tsx` |
| Fun Ideas | `FunIdeas` | `src/components/FunIdeas.tsx` |
| -- | `SettingsModal` | `src/components/SettingsModal.tsx` |
| -- | `ParentAuthModal` | `src/components/ParentAuthModal.tsx` |
| -- | `ParentModeToggle` | `src/components/ParentModeToggle.tsx` |
| -- | `EditFamilyMembers` | `src/components/EditFamilyMembers.tsx` |
