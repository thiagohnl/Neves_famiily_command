# 05 - Fun Ideas

## Purpose

The Fun Ideas tab is a family activity bucket list. Users can add activity ideas with categories, cost estimates, locations (with Google Maps links), emoji, favorites, and scheduled dates. It supports filtering by category and favorites status.

## How It Works

### Access Control

The Fun Ideas tab does **not** require parent mode. Anyone can add, edit, delete, and favourite ideas.

### Data Model

```ts
interface FunIdea {
  id: string;
  name: string;
  category?: string;       // e.g., 'Outdoor', 'Indoor', 'Sports'
  notes?: string;
  emoji?: string;           // default '🎯'
  created_at?: string;
  location?: string;        // e.g., 'Central Park, NYC'
  cost?: string;            // 'Free', '$', '$$', '$$$', '$$$$'
  google_maps_link?: string;
  is_favorite?: boolean;
  scheduled_date?: string;  // 'YYYY-MM-DD' or null
}
```

### Categories

Ten predefined categories (defined as a constant array in the component):

1. Outdoor
2. Indoor
3. Sports
4. Arts & Crafts
5. Educational
6. Food & Dining
7. Entertainment
8. Adventure
9. Relaxation
10. Social

### Cost Options

Five cost tiers:

| Value | Meaning |
|---|---|
| `Free` | No cost |
| `$` | Low cost |
| `$$` | Moderate cost |
| `$$$` | Expensive |
| `$$$$` | Very expensive |

### Fun Idea Creation (Add)

1. User clicks "Add Idea" button.
2. A form slides in with these fields:

| Field | Type | Required | Default |
|---|---|---|---|
| Idea Name | text input | Yes | `''` |
| Category | select dropdown | No | `'Outdoor'` |
| Location | text input | No | `''` |
| Cost | select dropdown | No | `'Free'` |
| Emoji | EmojiPicker | No | `'🎯'` |
| Google Maps Link | URL input | No | `''` |
| Scheduled Date | date input | No | `''` |
| Notes | textarea | No | `''` |
| Mark as favorite | checkbox | No | `false` |

3. On submit, `addIdea(ideaData)` inserts into the `fun_ideas` Supabase table.
4. The new idea is prepended to the local state array.

### Fun Idea Editing (Update)

1. User clicks the edit (pencil) icon on an idea card.
2. The card switches to inline edit mode with editable fields.
3. On save, `updateIdea(id, updates)` updates the row in Supabase and patches local state.

### Fun Idea Deletion

1. User clicks the delete (trash) icon.
2. A `confirm()` dialog asks: `Are you sure you want to delete "${name}"?`
3. `deleteIdea(id)` removes the row from Supabase and filters it from local state.

### Favorites

- Each idea card has a heart icon button.
- Clicking it calls `toggleFavorite(id, !currentFavorite)`.
- This updates the `is_favorite` boolean on the `fun_ideas` row in Supabase.
- Favourite ideas are sorted first in the list (fetched with `.order('is_favorite', { ascending: false })`).

### Scheduling

- Each idea card has a calendar icon button.
- Clicking it reveals a date input field inline.
- Selecting a date calls `updateIdea(id, { scheduled_date: date || null })`.
- Ideas with a `scheduled_date` show the formatted date on the card.
- Ideas scheduled for today appear on the Board tab in the "Today's Fun" summary card.

### Filtering

Two filter controls:

1. **Category dropdown:** "All Categories" + each of the 10 categories.
2. **Favorites Only button:** Toggle that shows only ideas where `is_favorite === true`. The heart icon fills when active.

Filter logic:
```ts
const filteredIdeas = ideas.filter(idea => {
  if (filterCategory !== 'all' && idea.category !== filterCategory) return false;
  if (filterFavorites && !idea.is_favorite) return false;
  return true;
});
```

### Stats Cards

Three stat cards above the ideas grid:

1. **Total Ideas** -- `ideas.length`
2. **Favorites** -- Count of ideas where `is_favorite === true`
3. **Categories** -- Count of unique non-null categories: `new Set(ideas.map(idea => idea.category).filter(Boolean)).size`

### Idea Card Display

Each idea card shows:
- Emoji + name
- Category badge (blue pill)
- Cost badge (green pill)
- Location with map pin icon + optional Google Maps external link
- Notes in a gray box
- Scheduled date (if set)
- Action buttons: favorite (heart), schedule (calendar), edit (pencil), delete (trash)

### Ideas Grid

Ideas are rendered in a responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

Empty state shows when no ideas match filters: "No fun ideas found" with contextual help text.

## Rules

- No parent mode required. All users can manage fun ideas.
- Idea name is the only required field. Validation: `if (!newIdea.name.trim())`.
- Deletion requires browser `confirm()` dialog.
- Ideas are fetched sorted by `is_favorite DESC, created_at DESC` -- favourites appear first.
- The `isSubmitting` flag prevents double-submission during add/update/schedule operations.
- Scheduling is done via the `scheduled_date` field on the `fun_ideas` table directly, not through a separate join table.
- Ideas with `scheduled_date === todayDate` appear on the Board tab's "Today's Fun" card.

## Edge Cases

- If the `fun_ideas` table fails to load, an error screen is shown with the error message.
- Category and cost are optional. Cards gracefully hide badges when these are `null`/`undefined`.
- Google Maps link is only shown as a clickable icon if both `location` and `google_maps_link` are set.
- Empty `scheduled_date` or empty string is stored as `null` in Supabase.
- The `EmojiPicker` component is used for emoji selection during creation.
- During inline editing, only the name field is immediately visible. Full editing requires the edit form.

## Component Map

| Component | File | Role |
|---|---|---|
| `FunIdeas` | `src/components/FunIdeas.tsx` | Main fun ideas page |
| `EmojiPicker` | `src/components/EmojiPicker.tsx` | Emoji selection widget |

### Hook Used

| Hook | Source | Data |
|---|---|---|
| `useFunIdeas` | `src/hooks/useFunIdeas.ts` | Ideas CRUD, favorites toggle |

### Hook API

```ts
const {
  ideas,          // FunIdea[]
  loading,        // boolean
  error,          // string | null
  refetch,        // () => Promise<void>
  addIdea,        // (data: Omit<FunIdea, 'id' | 'created_at'>) => Promise<FunIdea>
  updateIdea,     // (id: string, updates: Partial<FunIdea>) => Promise<FunIdea>
  deleteIdea,     // (id: string) => Promise<void>
  toggleFavorite, // (id: string, isFavorite: boolean) => Promise<FunIdea>
} = useFunIdeas();
```
