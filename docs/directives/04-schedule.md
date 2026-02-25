# 04 - Schedule

## Purpose

The Schedule tab provides a weekly calendar view for family events. Parents can create, edit, and delete both one-time and recurring events, assign them to family members, and view them on a time-based grid. It supports overlapping event layout, week navigation, and colour-coded member assignment.

## How It Works

### Access Control

The Schedule tab **requires parent mode**. If `isParentMode` is `false`, a locked screen is displayed:

```
[lock emoji]
Parent Access Required
Only parents can manage the schedule.
```

### Weekly Calendar Layout

The calendar shows 7 days (one week) with navigation to move forward/backward by week.

**Grid structure:**
- CSS Grid with columns: `72px repeat(7, minmax(0, 1fr))` -- a time gutter plus 7 day columns.
- Rows: 15 hour slots starting at hour 7 (7 AM to 9 PM).
- Each hour row is `80px` tall.

**Constants:**

```ts
const PIXELS_PER_HOUR = 80;
const TIMELINE_START_HOUR = 7;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;  // ~1.33
```

**Week state:**
- `currentWeek` is a `dayjs` object set to the start of the current week.
- `weekDays` is an array of 7 dayjs objects for the visible week.
- Navigation buttons shift `currentWeek` by +/- 1 week.

### Event Data Model

```ts
interface ScheduleEvent {
  id: string;
  title: string;
  date: string | null;          // null for recurring events
  start_time: string;           // 'HH:mm'
  end_time: string;             // 'HH:mm'
  assigned_member_ids: string[]; // array of family member IDs
  is_recurring: boolean;
  recurring_days: string[];     // e.g., ['Monday', 'Wednesday']
  color: string;                // hex color
  notes?: string;
  created_at: string;
}
```

### Event Expansion for Display

Events are expanded for display in `allScheduledEventsForWeek` (a `useMemo`):

- **Recurring events:** For each day in the visible week, if the day name matches one of the event's `recurring_days`, the event is added for that day. Additionally, a separate entry is created **per assigned member**.
- **One-time events:** If the event's `date` falls within the visible week, it is added. A separate entry is created per assigned member.

This means a single recurring event assigned to 3 members on 5 days produces 15 rendered blocks.

### Overlapping Event Layout

The `layoutEventsForDay` function implements a column-packing algorithm for overlapping events:

1. Events are sorted by start time, then by duration (longer first).
2. Events are grouped into **clusters** of overlapping events.
3. Within each cluster, events are assigned to **columns** using a greedy fit algorithm.
4. Each event receives `column` (0-indexed) and `totalColumns` (number of columns in its cluster).
5. Width and left offset are calculated:

```ts
const widthPercent = 100 / event.totalColumns;
const leftPercent = widthPercent * event.column;
const width = `calc(${widthPercent}% - ${gap * (totalColumns - 1) / totalColumns}px)`;
const left = `calc(${leftPercent}% + ${gap * column}px)`;
```

### Event Positioning

Events are positioned absolutely within each day column:

```ts
const topPosition = (startMinutes - (TIMELINE_START_HOUR * 60)) * PIXELS_PER_MINUTE;
const height = displayDuration * PIXELS_PER_MINUTE;
// displayDuration = Math.max(15, endMinutes - startMinutes)  -- minimum 15 minutes
```

Events are rendered as coloured blocks using the event's `color` property, showing title, member name/avatar, and time range.

### Member Colours

A palette of 8 colours is used for default event colouring:

```ts
const MEMBER_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Green
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple (repeat)
];
```

### Event Modal (Add/Edit)

The `EventModal` component provides the event form:

| Field | Type | Required | Default |
|---|---|---|---|
| Event Title | text input | Yes | `''` |
| Start Time | time input | Yes | `'09:00'` |
| End Time | time input | Yes | `'10:00'` |
| Assign To | multi-select buttons | Yes (at least 1) | `[]` |
| Is Recurring | checkbox | No | `false` |
| Recurring Days | day toggle buttons (Mon-Sun) | Yes if recurring | `[]` |
| Date | date input | Yes if not recurring | today |
| Event Color | colour swatch buttons | No | first MEMBER_COLORS |
| Notes | textarea | No | `''` |

**Validation rules (in `handleSubmit`):**
1. Title is required.
2. Start and end times are required.
3. At least one family member must be assigned.
4. If recurring, at least one recurring day must be selected.
5. If not recurring, a date must be provided.

### CRUD Operations

All CRUD operations go directly to the `schedule_events` Supabase table:

**Create:**
```ts
await supabase.from('schedule_events').insert(eventData);
```

**Update:**
```ts
await supabase.from('schedule_events').update(eventData).eq('id', eventData.id);
```

**Delete:**
```ts
await supabase.from('schedule_events').delete().eq('id', event.id);
```

- Deletion requires a `confirm()` dialog.
- After each operation, `fetchEvents()` re-queries all events.
- Toast messages confirm success or failure.

### Day Headers

Each day column header shows:
- Abbreviated day name (e.g., "Mon")
- Day number, highlighted in purple if it is today: `day.isSame(dayjs(), 'day')`

### Week Navigation

The header shows the date range (e.g., "Feb 24 - Mar 2, 2026") with left/right chevron buttons to navigate weeks. An "Add Event" button opens the event modal.

## Rules

- Parent mode is required for the entire Schedule tab.
- Events are fetched fresh on every week navigation change.
- Recurring events appear on every matching day of the visible week.
- Each assigned member gets their own rendered event block.
- Events have a minimum display height of 15 minutes to remain visible.
- Overlapping events are laid out side-by-side in columns, not stacked.
- Clicking an event block opens the edit modal. The delete button appears on hover.
- The time gutter header cell shows a `Clock` icon.
- Events only render in the first hour row (`hour === TIMELINE_START_HOUR`) but span the full height of the calendar for proper absolute positioning.

## Edge Cases

- If `end_time` is earlier than `start_time`, the event will have zero or negative height (clamped to minimum 15 minutes display).
- If `start_time` or `end_time` is empty/null, `timeToMinutes` defaults to `"00:00"` (midnight), placing the event before the visible area.
- Events with `end_time` past midnight are clamped: `Math.min(timeToMinutes(end_time), 24 * 60 - 1)`.
- Recurring events with `date: null` are only shown on matching `recurring_days`. If `recurring_days` is empty, they never appear.
- The `isBetween` dayjs plugin is used with inclusive bounds `'[]'` for checking if one-time events fall within the week.
- If no events exist, only the empty calendar grid is shown.

## Component Map

| Component | File | Role |
|---|---|---|
| `Schedule` | `src/components/Schedule.tsx` | Main schedule page |
| `EventModal` | (inline in Schedule.tsx) | Add/edit event form modal |
| `TodaysScheduleCard` | `src/components/TodaysScheduleCard.tsx` | Board tab summary card |

### Data Flow

1. `fetchEvents()` queries `schedule_events` table (all events, ordered by `created_at DESC`).
2. `allScheduledEventsForWeek` memo expands recurring and one-time events for the visible week.
3. `layoutEventsForDay` positions overlapping events into columns.
4. Events render as absolutely positioned coloured blocks on the CSS grid.
