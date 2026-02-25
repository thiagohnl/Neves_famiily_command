# 06 - Settings and Auth

## Purpose

The Settings modal controls app-wide configuration (title, theme, email summaries, parent PIN). The parent auth system provides a simple PIN-based access control that gates administrative actions such as chore management and schedule editing.

## How It Works

### Settings Modal

The `SettingsModal` component is a modal dialog accessible via the palette icon in the header. It does **not** require parent mode to open.

**Settings fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| App Title | text input | `'Family Chore Board'` | Displayed in the header `<h1>` |
| Theme | radio-style buttons | `'light'` | One of `'light'`, `'dark'`, `'kids'` |
| Email Summaries | toggle switch | `false` | Enable/disable weekly email reports |
| Parent PIN | 4-digit input | `'1234'` | PIN for parent mode authentication |

**Theme options:**

| Value | Label | Emoji | Gradient |
|---|---|---|---|
| `light` | Light Mode | sun | `from-blue-50 to-indigo-100` |
| `dark` | Dark Mode | moon | `from-gray-800 to-gray-900` |
| `kids` | Kids Mode | rainbow | `from-pink-100 via-purple-100 to-indigo-100` |

**Theme application** (in `App.tsx`):

```ts
useEffect(() => {
  const root = document.documentElement;
  root.classList.remove('dark', 'kids-theme');
  if (settings.theme === 'dark') root.classList.add('dark');
  else if (settings.theme === 'kids') root.classList.add('kids-theme');
}, [settings.theme]);
```

The theme adds a CSS class to `<html>`, which TailwindCSS `dark:` variant and custom `.kids-theme` styles can target.

**PIN change:**

1. User clicks "Change PIN" button.
2. A 4-digit numeric input appears. Non-digit characters are stripped: `e.target.value.replace(/\D/g, '').slice(0, 4)`.
3. The PIN is included in the settings update only if it has exactly 4 digits.
4. PIN is stored in the `app_settings` table under the `parent_pin` column.

**Save flow:**

1. User clicks "Save Settings".
2. `onUpdateSettings` (from `useAppSettings`) is called with the form data.
3. The hook performs an **optimistic update** (updates local state immediately).
4. `dataGateway.updateAppSettings` upserts to the `app_settings` table with `id: 'default'`.
5. On success: toast "Settings saved successfully!", modal closes.
6. On failure: local state is reverted, toast "Failed to save settings".

**Reset button:** Reverts the form to the current saved settings values without saving.

### AppSettings Type

```ts
interface AppSettings {
  id: string;              // always 'default'
  title: string;
  theme: 'light' | 'dark' | 'kids';
  email_summaries: boolean;
  parent_pin?: string;
  created_at?: string;
  updated_at?: string;
}
```

### useAppSettings Hook

**Source:** `src/hooks/useAppSettings.ts`

Uses `dataGateway` (not direct Supabase calls) for settings CRUD:

```ts
const { settings, loading, updateSettings } = useAppSettings();
```

- `settings` -- current `AppSettings` object.
- `loading` -- true while fetching.
- `updateSettings(updates)` -- optimistic upsert, returns `boolean`.

**Default values** (used before settings load or on error):

```ts
{
  id: '',
  title: 'Family Chore Board',
  theme: 'light',
  email_summaries: false
}
```

### dataGateway

**Source:** `src/lib/dataGateway.ts`

```ts
getAppSettings()    // SELECT * FROM app_settings ORDER BY updated_at DESC LIMIT 1
updateAppSettings() // UPSERT into app_settings with id='default'
```

### Parent Auth Flow

**Hook:** `useParentAuth` from `src/hooks/useParentAuth.ts`

**Initialization:**
1. On mount, loads the PIN from `app_settings.parent_pin` via Supabase.
2. If the query fails or returns no PIN, falls back to default `'1234'`.
3. Checks `localStorage.getItem('parentMode')`. If `'true'`, sets `isAuthenticated = true` (persist across page refreshes).

**Authentication:**
1. User clicks the parent mode toggle in the header.
2. `ParentAuthModal` opens with a PIN input field.
3. User enters PIN and submits.
4. `authenticateParent(pin)` compares against the stored PIN.
5. If match: `isAuthenticated = true`, `localStorage.setItem('parentMode', 'true')`, modal closes.
6. If no match: returns `false`, modal stays open.

**Exit parent mode:**
1. User clicks the parent mode toggle again.
2. `exitParentMode()` sets `isAuthenticated = false` and `localStorage.removeItem('parentMode')`.

**PIN update:**
```ts
updatePin(newPin) // UPDATE app_settings SET parent_pin = newPin WHERE id = 'default'
```

### Hook API

```ts
const {
  isAuthenticated,     // boolean -- is parent mode active
  authenticateParent,  // (pin: string) => boolean
  exitParentMode,      // () => void
  updatePin,           // (newPin: string) => Promise<boolean>
  currentPin,          // string -- current PIN value
  loading,             // boolean
} = useParentAuth();
```

### Parent Mode Toggle

The `ParentModeToggle` component in the header shows a toggle button. It:
- Shows the current parent mode state.
- Calls `onRequestAuth()` to open the PIN modal when toggling on.
- Calls `onExitParentMode()` when toggling off.

### Which Features Require Parent Mode

| Feature | Requires Parent Mode |
|---|---|
| Board tab (view + complete chores) | No |
| Chores tab (all CRUD) | Yes |
| Meal Plan tab | No (view), varies for edits |
| Schedule tab (all CRUD) | Yes |
| Fun Ideas tab (all CRUD) | No |
| Settings modal | No (opens for anyone) |
| Edit Family Members | Yes (button only visible in parent mode) |

### localStorage Persistence

| Key | Value | Purpose |
|---|---|---|
| `parentMode` | `'true'` or absent | Persist parent mode across page refreshes |

## Rules

- The default parent PIN is `'1234'`. It is loaded from Supabase on mount and falls back to the default if the query fails.
- PIN is stored as plain text in `app_settings.parent_pin` -- there is no hashing.
- Parent mode persists across page refreshes via `localStorage`.
- Settings use optimistic updates. If the Supabase upsert fails, local state reverts.
- The settings modal uses a focus trap (`useFocusTrap`) for keyboard accessibility.
- Theme changes are applied immediately via CSS class on `document.documentElement`.
- The "Change PIN" field only accepts digits and is limited to 4 characters.

## Edge Cases

- If `app_settings` table has no rows, the PIN defaults to `'1234'` and settings default to the initial state.
- If the Supabase query for PIN fails silently, the user can still authenticate with `'1234'`.
- If `localStorage` is cleared (e.g., by the browser), parent mode is lost on next load.
- If the user changes the PIN in settings but does not save, the old PIN remains active.
- The settings modal form state is initialised from `settings` prop but does not reactively update if settings change externally while the modal is open.
- The "Reset" button in settings only resets to the values at modal-open time, not to factory defaults.

## Component Map

| Component | File | Role |
|---|---|---|
| `SettingsModal` | `src/components/SettingsModal.tsx` | Settings modal dialog |
| `ParentAuthModal` | `src/components/ParentAuthModal.tsx` | PIN entry modal |
| `ParentModeToggle` | `src/components/ParentModeToggle.tsx` | Header toggle button |

### Hooks Used

| Hook | Source | Data |
|---|---|---|
| `useAppSettings` | `src/hooks/useAppSettings.ts` | Settings read/write |
| `useParentAuth` | `src/hooks/useParentAuth.ts` | PIN auth, parent mode state |
