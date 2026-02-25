# 01 - Board (Timeline Chore View)

## Purpose

The Board tab is the main dashboard. It presents today's chores on a vertical timeline, shows summary cards for family progress, today's meals, today's fun activity, and today's schedule. Kids can tap "Done!" to complete chores and see a confetti celebration.

## How It Works

### Summary Cards

Four cards are rendered at the top in a responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`):

1. **Family Progress** -- Shows each family member's avatar, name, and points. Uses gradient `from-purple-100 to-pink-100`.
2. **Meal of the Day** -- Renders the `TodaysMeals` sub-component which uses the `useTodayMeal` hook to fetch today's meal plan (lunch and dinner). Uses gradient `from-orange-100 to-yellow-100`.
3. **Today's Fun** -- Renders the `TodaysFun` sub-component, which combines planned activities for today (from `useActivities`) and fun ideas with `scheduled_date` matching today (from `useFunIdeas`). Uses gradient `from-green-100 to-blue-100`.
4. **Today's Schedule** -- Renders the `TodaysScheduleCard` component, which shows today's schedule events.

### Timeline View

The timeline is a vertical time grid spanning from 7:00 AM to 9:00 PM (15 hours). Key constants:

```ts
const PIXELS_PER_MINUTE = 2;
const TIMELINE_START_HOUR = 7;
```

**Layout:**
- A left **time gutter** (width `w-16`) displays hour labels formatted as `7am`, `8am`, etc. using `dayjs().hour(hour).format('ha')`.
- The main area is a CSS grid with one column per family member.
- Each family member has a **header** with their avatar and name.
- **Vertical lines** run behind each member's column.
- **Horizontal lines** mark each hour boundary at `120px` height intervals.

### Chore Positioning

Chores are positioned absolutely on the timeline based on their `scheduled_time` field:

```ts
top = (timeToMinutes(chore.scheduled_time) - (TIMELINE_START_HOUR * 60)) * PIXELS_PER_MINUTE - 25
```

The `timeToMinutes` helper converts `"HH:mm"` strings to total minutes:

```ts
const timeToMinutes = (timeStr: string = "00:00"): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};
```

Chores are filtered to show only those assigned to the current column's member **and** that have a `scheduled_time` set.

### Activity Positioning

Planned activities (from `useActivities`) are also positioned on the timeline using their `start_time` and `end_time`:

```ts
top = (timeToMinutes(activity.start_time) - (TIMELINE_START_HOUR * 60)) * PIXELS_PER_MINUTE
height = (timeToMinutes(activity.end_time) - timeToMinutes(activity.start_time)) * PIXELS_PER_MINUTE
```

Activities appear as blue blocks (`bg-blue-100 border-l-4 border-blue-500`).

### Current Time Indicator

A red horizontal line with a dot indicates the current time. It updates every 60 seconds via `setInterval`. Position:

```ts
currentTimePosition = (timeToMinutes(currentTimeFormatted) - timeToMinutes('7:00')) * PIXELS_PER_MINUTE
```

Only shown when `currentTimePosition > 0` (i.e., after 7 AM).

### Chore Completion Flow

1. User clicks the "Done!" button on an incomplete chore card.
2. `handleCompleteChore(choreId, points, assignedTo)` is called.
3. This calls `onCompleteChore` (passed from `App.tsx` which delegates to `useChores.completeChore`).
4. On success, `setShowConfetti(true)` triggers the `ConfettiCelebration` component.
5. `ConfettiCelebration` renders 500 confetti pieces with `react-confetti`, plays a celebration sound, and shows a toast: "Awesome work! You're amazing!".
6. After confetti completes, `onComplete` callback sets `showConfetti` back to `false`.
7. Data is refetched in `useChores.handleCompleteChore` after successful completion.

### Chore Card States

- **Incomplete:** White background, green "Done!" button with `CheckCircle` icon. Button uses `motion.button` with `whileHover: { scale: 1.05 }` and `whileTap: { scale: 0.95 }`.
- **Completed:** Green background (`bg-green-50 border-green-200`), shows "Completed" text with a checkmark.

### TodaysMeals Sub-component

```tsx
const TodaysMeals: React.FC = () => {
  const { lunch, dinner, loading } = useTodayMeal();
  // Shows "Loading..." while fetching
  // Shows "No meals planned" if both lunch and dinner are null
  // Otherwise shows lunch and/or dinner with meal_name
};
```

### TodaysFun Sub-component

Merges two data sources:
1. `plannedActivities` -- from `useActivities`, filtered to today's date.
2. `funIdeasToday` -- from `useFunIdeas`, filtered where `idea.scheduled_date === todayDate`.

Recurring activities are expanded: activities with `recurring_days` matching today's day name are turned into synthetic `PlannedActivity` objects for each `assigned_member_id`.

## Rules

- The Board tab is **always accessible** -- it does not require parent mode.
- Chores without a `scheduled_time` are **not shown** on the timeline.
- Only today's chores are displayed. Filtering is by `assigned_to === member.id`.
- The timeline gutter shows 15 hour slots starting at hour 7 (7 AM to 9 PM).
- Summary cards use `motion.div` with `initial={{ opacity: 0, y: 20 }}` for entrance animation.
- Activities are rendered at z-index 20, chores at z-index 30, so chores appear on top of activities.

## Edge Cases

- If a chore has no `scheduled_time`, it will not appear on the timeline at all.
- If `timeToMinutes` receives an empty or undefined string, it defaults to `"00:00"` (midnight), placing the item off-screen above the 7 AM start.
- If no family members exist, the grid has zero columns and no content is shown.
- The current time indicator is hidden before 7 AM (the timeline start).
- Planned activities for recurring events generate synthetic IDs: `recurring-${activity.id}-${member_id}`.

## Component Map

| Component | File | Role |
|---|---|---|
| `TimelineChoreBoard` | `src/components/TimelineChoreBoard.tsx` | Main board page |
| `ConfettiCelebration` | `src/components/ConfettiCelebration.tsx` | Confetti on chore completion |
| `TodaysScheduleCard` | `src/components/TodaysScheduleCard.tsx` | Schedule summary card |
| `TodaysMeals` | (inline in TimelineChoreBoard.tsx) | Meal of the day display |
| `TodaysFun` | (inline in TimelineChoreBoard.tsx) | Fun activity display |

### Hooks Used

| Hook | Source | Data |
|---|---|---|
| `useTodayMeal` | `src/hooks/useMeals.ts` | Today's lunch and dinner from `meal_plans` |
| `useActivities` | `src/hooks/useActivities.ts` | Activities and planned activities |
| `useFunIdeas` | `src/hooks/useFunIdeas.ts` | Fun ideas (filtered for today's scheduled_date) |
