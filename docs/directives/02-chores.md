# 02 - Chores

## Purpose

The Chores tab is the CRUD management interface for family chores. Parents can create, edit, delete, and complete chores. It supports multi-assignment (creating one chore for multiple family members at once), recurring schedules, a points system, time scheduling, and emoji customisation.

## How It Works

### Access Control

The Chores tab **requires parent mode**. If `isParentMode` is `false`, a locked screen is displayed:

```
[lock emoji]
Parent Access Required
Only parents can manage chores.
```

### Chore Creation (Add)

1. Parent clicks "Add Chore" button.
2. A `ChoreForm` component appears with these fields:

| Field | Type | Required | Default |
|---|---|---|---|
| Chore Name | text input | Yes | `''` |
| Assign To | multi-select buttons | Yes (at least 1) | `[]` |
| Recurring Days | toggle buttons (Mon-Sun) | No | `[]` |
| Points | select (5, 10, 20) | Yes | `5` |
| Start Time | time input | Yes | `'09:00'` |
| End Time | time input | No | `'10:00'` |
| Emoji | EmojiPicker | No | `'📋'` |

3. **Multi-assignment:** When adding, the form shows multi-select buttons for family members (not a dropdown). Selecting multiple members creates **one separate chore per member** via `Promise.all`:

```ts
const chorePromises = newChore.assigned_to_multi.map(memberId =>
  onAddChore({
    name: newChore.name.trim(),
    assigned_to: memberId,
    points: newChore.points,
    recurring_days: newChore.recurring_days,
    emoji: newChore.emoji,
    scheduled_time: newChore.scheduled_time,
    end_time: newChore.end_time
  })
);
await Promise.all(chorePromises);
```

4. Each `onAddChore` call invokes `useChores.handleAddChore`, which inserts into the `chores` table with `is_completed: false`.

### Chore Editing (Update)

1. Parent clicks the edit (pencil) icon on a chore card.
2. The same `ChoreForm` renders in edit mode (`isEditing: true`).
3. In edit mode, the assignee is a **single-select dropdown** (not multi-select), since each chore row already has one `assigned_to`.
4. Update is sent directly to Supabase:

```ts
await supabase.from('chores').update({
  name, assigned_to, points, recurring_days,
  scheduled_time, end_time, emoji
}).eq('id', choreData.id);
```

### Chore Deletion

1. Parent clicks the delete (trash) icon.
2. A `confirm()` dialog asks: `Are you sure you want to delete "${choreName}"?`
3. On confirmation, `supabase.from('chores').delete().eq('id', choreId)` is called.
4. Data is refetched via `onRefresh`.

### Chore Completion (from Chores tab)

1. Parent clicks "Mark Complete" on an incomplete chore card.
2. The chore is updated: `is_completed: true, completed_at: new Date().toISOString()`.
3. The `increment_points` RPC is called to add points to the assigned member.
4. Data is refetched.
5. Toast: "Chore completed!" (no confetti on the Chores tab, unlike the Board tab).

### Filtering

Two filter dropdowns above the chore grid:

- **Family Member:** Filter by `assigned_to`. Options: "All Family Members" + each member.
- **Status:** Filter by completion. Options: "All Status", "Pending" (not completed), "Completed".

### Points System

Three tiers:

| Points | Label |
|---|---|
| 5 | Easy |
| 10 | Medium |
| 20 | Hard |

Points are awarded via the `increment_points` RPC function when a chore is completed. The TypeScript type is `ChorePoints = 5 | 10 | 20`.

### Recurring Days

Chores can recur on specific days of the week. The `recurring_days` field is a `string[]` containing day names like `['Monday', 'Wednesday', 'Friday']`. If left empty, the chore is a one-time or floating task.

### Emoji Support

The `EmojiPicker` component is used for selecting chore emojis. It uses data from `src/constants/chore_emojis.ts` which provides `ALL_CHORE_EMOJIS` and a `searchChoreEmojis` function.

### Chore Card Display

Each chore card shows:
- Emoji + name (with completion badge if done)
- Assigned member name
- Points with star icon
- Recurring days (if any) with calendar icon
- Scheduled time range with clock icon (formatted as `h:mm A`)
- Edit and delete buttons
- "Mark Complete" button (if not completed)

## Rules

- Parent mode is required for all actions on this tab (add, edit, delete, complete).
- Chore name and assignee are required fields. Validation: `if (!choreData.name?.trim() || !choreData.assigned_to)`.
- Multi-assignment on creation creates N independent chore rows (one per selected member).
- Edit mode only allows single-member assignment changes.
- Deletion requires browser `confirm()` dialog approval.
- After every mutation (add, edit, delete, complete), `onRefresh` (which is `useChores.loadData`) is called to reload all data from Supabase.

## Edge Cases

- If no family members exist, the assign-to buttons/dropdown will be empty.
- If all selected members fail during multi-assignment, a generic toast error is shown.
- The `isLoading` state is shared across all actions -- clicking "Mark Complete" on one chore disables it on all chore cards simultaneously.
- Chores ordered by `created_at DESC` from Supabase, so newest appear first.
- The `end_time` field is optional; some chores may only have a `scheduled_time`.

## Component Map

| Component | File | Role |
|---|---|---|
| `ChoreManagement` | `src/components/ChoreManagement.tsx` | Main chores page (default export) |
| `ChoreForm` | (inline in ChoreManagement.tsx) | Reusable form for add/edit |
| `EmojiPicker` | `src/components/EmojiPicker.tsx` | Emoji selection widget |

### Hook Used

| Hook | Source | Data |
|---|---|---|
| `useChores` | `src/hooks/useChores.ts` | Chores list, family members, addChore, completeChore, refetch |
