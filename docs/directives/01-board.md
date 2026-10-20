# 01 - Board

## Purpose

The Board tab is the main dashboard on the kitchen wall tablet (Fully Kiosk, ~1280×800, touch only, read from about a metre away). It has two layouts, chosen by `app_settings.board_layout` (Settings → Board Layout, open to everyone so the family can fall back):

| `board_layout` | Component | What it shows |
|---|---|---|
| `'home'` (default; also used when the value is missing) | `HomeBoard` | Whereabouts clock + points on the left, one merged "Today" list on the right |
| `'timeline'` | `TimelineChoreBoard` | Five summary cards above a per-member chore timeline |

In both, kids tap "Done!" to complete a chore and get the confetti celebration, and during a season (Sinterklaas, Christmas, birthdays) a hero strip and season colours are added. `App.tsx` picks the component; the tabs and `CallFamilyButtons` are identical in both.

## Home Layout (`board_layout = 'home'`)

**Files:** `src/components/home/` -- `HomeBoard.tsx`, `TodayList.tsx`, `WhereaboutsClock.tsx`, `WhereaboutsSheet.tsx`, `PointsLegend.tsx`, `MemberAvatar.tsx`. Data from `src/hooks/useTodayItems.ts`, merge logic in `src/lib/todayItems.ts` (pure, tested in `src/hooks/__tests__/todayItems.test.ts`).

**Layout.** On `md` and up: a row sized `h-[calc(100vh-10rem)]` (header + tab bar + main padding) so the page never scrolls at 1280×800; only the list scrolls. Fonts: Nunito for the body (`font-body`), Lora italic for the "Today" heading (`font-display`), loaded from Google Fonts in `index.html` and applied to this layout only.
- **Left column** (fixed 470 px, hidden below `md`): the `WhereaboutsClock` (see below) and `PointsLegend` under it -- colour dot, name, ⭐ points and the member's whereabouts ("🧒 Playdate · until 17:30") in a 2×2 grid; tapping a row opens the whereabouts sheet. The leaderboard stays on the Chores tab.
- **Right column:** header row (serif italic "Today", the date, and a dinner chip on the right that opens `RecipeViewModal` when the dinner has a recipe), the scrolling list, then the bottom strip: `SeasonHero` (`size="strip"`) when a season is active, then `VerseOfTheDayCard variant="strip"` (one truncated line). With a hero showing and a viewport under 760 px tall, the verse hides first.

**`useTodayItems(chores, familyMembers)`** returns `{ items, dinner, nowMinutes }`. Chores are passed in from App's `useChores` state (calling `useChores()` again would be a second copy that misses completions); every other source reloads on the board refresh `tick`, and the date always comes from `useBoardRefresh().today`. Sources:

| Kind | Source | Item |
|---|---|---|
| `chore` | `chores` prop | Same day filter as the timeline (has `scheduled_time`; no `recurring_days` or includes today's weekday). Completed chores stay only if `completed_at` is today, shown as past. Subtitle "Chore, N points", colour = member colour, `completable` while open. |
| `event` | `useScheduleEvents(today)` | Dated today or recurring on today's weekday; `memberIds` = `assigned_member_ids`, subtitle "Until HH:mm" + notes. |
| `google` | `useGoogleCalendar(today, today)` | Title kept as typed (so "Playdate at Jonas's house" keeps the host); subtitle "Until HH:mm" + location; `memberIds` = family members whose name appears as a whole word in the title (Google events have no assignees). All-day events become `allDay` items. |
| `activity` | `useActivities` | Planned for today plus recurring on today's weekday, merged into one item per activity with all its members. No start time → `allDay`. |
| `fun` | `useFunIdeas` | Ideas with `scheduled_date` = today, `allDay`. |
| `meal` | `useTodayMeal` | One 16:30 "Dinner prep: <name>" item, only when a dinner is planned and no schedule/Google item today mentions dinner (`dinner`, `jantar`, `avondeten`) -- that entry already covers it. |
| `ritual` | `useSeason().rituals` | Season rituals, e.g. 18:00 Sinterklaasjournaal. |

Emoji for events and Google items come from the title: playdate 🧒, school/drop off/pick up 🏫, dentist 🦷, church ⛪, work/office 💼, otherwise 📅 (Portuguese and Dutch keywords included).

**Status and order** (`finalizeTodayItems`, recomputed every minute from `useNow()`):
- An item is *now* from its start until its end; items without an end count as 30 minutes long. It is *past* once the end has gone by.
- Chores are past only when completed, so an overdue chore keeps its Done button.
- All-day items are listed first, are never past, and count as "now" all day.
- Timed items follow by start time.
- The red NOW line (`nowLineIndex`) goes before the first timed item that hasn't started yet.

**`TodayList` rows:**
- **Past:** compact 17 px row, muted grey, green check, time, emoji, the members' faces (22 px, faded -- so two kids' copies of one chore stay distinguishable) and struck-through title.
- **Current and upcoming:** white card with a left border in the item colour, 64 px time column (18 px bold, "All day" for all-day items), emoji, 22 px bold title, the members' faces, a 16 px subtitle, and for open chores a green 52 px "Done!" button. An item in progress gets a ring in `season.accent`.
- **Feedback:** taps use `whileTap` only; nothing needs hover.

**Completing a chore:** Done → `onCompleteChore` → `useChores.completeChore`, which on success updates the chore (`is_completed`, `completed_at`) and the member's points in local state straight away, then refetches quietly (`loadData(true)`). The row turns muted without a reload; `HomeBoard` shows `ConfettiCelebration`.

**Auto-scroll:** the list container carries `data-timeline-scroll` and the NOW line `data-now-line`; `useFollowNowLine(nowMinutes, c => c.clientHeight / 3)` keeps the line a third of the way down. The trigger is `nowMinutes|items.length`, so it also re-follows when late-loading sources (calendar, schedule) change the list. It pauses for 2 minutes after a manual scroll. The same hook drives the timeline layout.

## Whereabouts Clock (home layout)

A Weasley-style clock: one hand per member pointing at where they are.

**Statuses** (`src/constants/whereabouts.ts`): `home` 🏠, `school` 🏫, `work` 💼, `church` ⛪, `grandma` 👵 (label "Grandma's"), `playdate` 🧒, `travelling` 🚗, `sleeping` 😴. A season can swap emoji via `Season.clockEmoji`.

**Resolution** (`resolveWhereabouts` in `src/lib/whereabouts.ts`, pure, tested in `src/hooks/__tests__/whereabouts.test.ts`), per member, first match wins:
1. **Override** from `whereabouts_overrides` with `expires_at` null or in the future. `manual` beats `presence`; within a source the newest `set_at` wins.
2. **Calendar**: a Today item that is happening now (`isNow`) and is assigned to the member or to the whole family (`memberIds` empty), whose title contains a `whereabouts_rules` keyword. Rules apply to everyone (`member_id` null) or to one member; the highest `priority` wins. Keywords match case-insensitively as whole words, accent-safe ("vovó" matches, "work" does not match "Homework"). `until` = the item's end time.
3. **Default**: children (`is_parent = false`) are `sleeping` from 20:00 to 07:00; otherwise `home`.

Each result is `{ status, source: 'manual' | 'presence' | 'calendar' | 'default', label: '🧒 Playdate', until? }`. Expiry is re-checked every minute (`useNow`), so a lapsed override hands back to the calendar without a reload.

**`useWhereabouts(familyMembers, todayItems)`** (`src/hooks/useWhereabouts.ts`): loads active overrides and rules through `src/lib/whereaboutsApi.ts` on every refresh `tick`, re-loads overrides on any Supabase realtime change to `whereabouts_overrides` (so a phone update moves the hand within seconds), and resolves with the Today items `HomeBoard` already has (passed in rather than calling `useTodayItems()` a second time). Returns `{ whereabouts, setStatus(memberId, status | null) }`.

**`WhereaboutsClock`** (`src/components/home/WhereaboutsClock.tsx`): a 440×440 SVG with an outer ring stroked `--season-accent`, a dashed inner guide ring, and eight emoji + word labels (18 px bold) in 45° steps, clockwise from the top: School, Playdate, Work, Travelling, Sleeping, Grandma's, Home, Church. Label positions are fixed per status (`LABEL_POS`): side and diagonal labels are anchored on their outer edge and grow inwards, so even "Travelling" stays ~10 px inside the ring (the tablet renders text wider than desktop Chrome; the first version overflowed there).
- **Hands:** each is a 6 px line in the member colour from the centre to radius 100 (short enough that a face never covers a label), ending in the member's photo (circular clip) or emoji avatar on their colour, with a white edge. The avatar is counter-rotated so faces stay upright.
- **Shared status** (`handSlots`, by how many share it):
  - 1: full hand, 26 px face radius.
  - 2: the second hand is 45 px shorter so the faces stack along it.
  - 3: a cluster at ±15° (full length) plus one at 56 px, 22 px faces.
  - 4: ±15° at full length plus ±27° at 56 px, 21 px faces.
  - 5 or more: 16 px faces spread over ±30°.
  - Clusters stay under ±30° so nobody looks as if they point at the neighbouring status.
- **Motion:** hands rotate with a framer-motion spring and take the short way round.
- **Tap:** tapping a face (or a legend row) opens the sheet.

**Where the clock gets the family's routine.** Besides taps on the board and phone presence, the clock only knows what's on today's list right now. Put regular places in as calendar entries:
- **Recurring routine** (school, daycare, office days): add a recurring event on the **Schedule** tab, e.g. "School", Mon–Fri 08:30–15:00, assigned to Charlie. "Daycare" assigned to Isabel works the same way (daycare/creche/kinderopvang/BSO count as School).
- **One-off days:** a Google Calendar event whose title contains a keyword *and* the person's name, e.g. "Carol WFH" or "Thiago Zaandam office". Without a name, an event counts for the whole family.
- **Just today:** tap the face on the clock (4 hours).

Every such entry also appears as a row in the Today list.

**`WhereaboutsSheet`**: "Where is <name>?" with the eight statuses as large emoji buttons (96 px tall) and "Clear".
- **Who can be set:** in parent mode the sheet also lists every member to pick from; otherwise only the tapped member can be set.
- **What a choice does:** it writes a `manual` override expiring in 4 hours (`MANUAL_OVERRIDE_HOURS`), replacing any earlier manual one. Clear deletes the manual override, so presence or the calendar takes over.

### Presence endpoint

`api/presence.ts` (Vercel function) lets a phone report where someone is -- Home Assistant, Tasker or an iOS Shortcut calls it when the phone joins or leaves the home WiFi.

```bash
curl -X POST https://neves-famiily-command.vercel.app/api/presence \
  -H "Content-Type: application/json" \
  -H "x-presence-key: $PRESENCE_SHARED_KEY" \
  -d '{"member": "Thiago", "status": "home", "ttl_minutes": 180}'
```

- **Request:**
  - `member`: matched against `family_members.name`, case-insensitively.
  - `status`: one of the eight statuses, or `"clear"` to remove that member's presence row.
  - `ttl_minutes`: optional; default 180, allowed 1 to 10080.
- **Effect:** deletes the member's existing `presence` row, then inserts a new one (source `presence`, `expires_at` = now + TTL). A manual override set on the board still wins.
- **Responses:**
  - `200 { ok, member, status, expires_at }` on success.
  - `401` wrong or missing key; `400` bad input; `404` unknown member; `405` not a POST.
  - `503` when `PRESENCE_SHARED_KEY` (or the Supabase URL/anon key) isn't set.
- **Configuration:** `PRESENCE_SHARED_KEY` is a server-only env var (never `VITE_`); keep it in Vercel and in `.env` for local use. The function reaches Supabase with `SUPABASE_URL`/`SUPABASE_ANON_KEY`, falling back to the existing `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
- **Tests:** `src/hooks/__tests__/presence.test.ts`.

## Timeline Layout (`board_layout = 'timeline'`)

The original layout: summary cards on top and a per-member vertical timeline below.

### Summary Cards

Five cards are rendered at the top in a responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-5`):

1. **Family Progress** -- Shows each family member's avatar, name, and points. Uses gradient `from-purple-100 to-pink-100`.
2. **Meal of the Day** -- Renders the `TodaysMeals` sub-component which uses the `useTodayMeal` hook to fetch today's meal plan (lunch and dinner). Uses gradient `from-orange-100 to-yellow-100`.
3. **Today's Fun** -- Renders the `TodaysFun` sub-component, which combines planned activities for today (from `useActivities`) and fun ideas with `scheduled_date` matching today (from `useFunIdeas`). Uses gradient `from-green-100 to-blue-100`.
4. **Today's Schedule** -- Renders the `TodaysScheduleCard` component, which shows today's schedule events.
5. **Verse of the Day** -- Renders the `VerseOfTheDayCard` component. Uses gradient `from-blue-100 to-indigo-100`.

### Call Family Buttons

Compact green pills (`CallFamilyButtons`) sit right-aligned in the tab bar (rendered by `App.tsx` after the Fun Ideas tab), one per contact, each showing photo/emoji + name + phone icon. Tapping opens an Android `intent://send?phone=<number>#Intent;scheme=whatsapp;...` URL, which launches the WhatsApp app on that contact's chat -- do not switch to `https://wa.me/` (inside the kiosk WebView it just renders WhatsApp's website, because Android app-links don't fire for in-WebView navigations) or a bare `whatsapp://` scheme (the WebView silently drops it). WhatsApp does not allow a link to dial directly, so the call itself is one more tap inside WhatsApp (intentional; do not attempt auto-call). Contacts are configured in the `CONTACTS` array at the top of `src/components/CallFamilyButtons.tsx` (name, digits-only WhatsApp number with country code, optional emoji or image path). Press feedback is `whileTap` scale only -- no hover styles, since the wall tablet is a touch-only Android WebView.

### Seasons (hero strip and palette)

During a season (Sinterklaas, Christmas, a family birthday) the Board shows a `SeasonHero` -- above the summary cards in the timeline layout (`size="full"`), in the bottom strip of the home layout (`size="strip"`) -- and the page takes on the season's colours. Outside a season nothing changes visually.

**Engine** (`src/seasons/`, pure functions, tested in `src/hooks/__tests__/seasons.test.ts`):

| File | Role |
|---|---|
| `types.ts` | `Season { key, name, emoji, isActive(today, dates), palette, hero?(today, dates, t), rituals(today, dates, t), clockEmoji? }`, `HeroSpec { emoji, headline, subline, chips[] }`, `SeasonPalette { bg, surface, accent, accentText, button, gold }` |
| `sinterklaas.ts` | Active `journaal_start` → `pakjesavond` inclusive. Headline counts sleeps to `intocht` while before it, "arrives today" on the day, then sleeps to `pakjesavond`. Subline: sleeps until `intocht_local`, else "Sinterklaasjournaal tonight at 18:00". Chips: Pakjesavond sleeps, "Shoe tonight?" Yes/No. Rituals: 18:00 📺 Sinterklaasjournaal every day of the season, 19:30 👟 "Put your shoe out" on `shoe_nights`. Palette bg `#F6EFE4`, accent `#9B1B2A`, gold `#D4A017`. |
| `christmas.ts` | Active 6–26 December every year, counts sleeps to the 25th ("Merry Christmas!" from the 25th). Green/gold palette, no rituals yet. |
| `birthdays.ts` | `birthdaySeason(members, today)` builds a one-day season when a member's `birth_date` anniversary is today (29 Feb → 28 Feb in non-leap years). Hero "Happy birthday Charlie!" 🎂 with "Charlie is 7 today"; several birthdays on one day are joined ("Charlie & Isabel"). Accent is the member's colour from `src/constants/memberColors.ts` (members have no colour column; colour is by list position, same as the Schedule tab). |
| `dates.ts` | `sleepsUntil(today, target)` counts calendar nights via UTC day numbers, so DST changes never add or lose a sleep. |
| `i18n.ts` | `t(key, lang, vars)` for season strings only (`en`, `pt`, `nl`). `{var}` placeholders; a `<key>_one` entry is used when `vars.n === 1`. Unknown language or missing key falls back to English. |
| `index.ts` | `getActiveSeason(settings, today, members)`: `active_season = 'none'` → no season; `'sinterklaas'`/`'christmas'` → that season regardless of date; otherwise (null or unknown value) the first active of birthday → Sinterklaas → Christmas. `resolveSeasonState()` adds the hero, rituals and palette. |
| `palette.ts` | `applySeasonPalette(root, palette)` sets/removes the CSS variables and the `season-active` class on `<html>`. |

**Hook:** `useSeason()` returns `{ season, hero, rituals, palette }` from `SeasonContext`. `App.tsx` owns the single source (`useSeasonSource(settings, familyMembers, boardRefresh.today)`) because it already holds the settings and members -- a second `useAppSettings()` instance would be separate state that never sees a Settings save. The season re-resolves when `today` rolls over at midnight.

**Palette:** applied in the same `useEffect` in `App.tsx` that handles `settings.theme`. Variables `--season-bg`, `--season-surface`, `--season-accent`, `--season-accent-text`, `--season-button`, `--season-gold`; Tailwind colours `season.bg`, `season.surface`, `season.accent`, `season.accent-text`, `season.button`, `season.gold` (e.g. `bg-season-accent`). Fallback values (light theme: white, purple `#8B5CF6`, amber) are defined on `:root` in `index.css`. The page background is tinted only while `season-active` is set and the theme is not dark.

**SeasonHero** (`src/components/SeasonHero.tsx`): rendered only when `hero` is not null. Accent background with gold border, emoji, headline, optional subline, chips on the right. Single opacity fade-in, no other animation. Sizes: `full` (64 px emoji, 44 px headline; timeline layout) and `strip` (48 px emoji, 28 px headline; home layout's narrower right column).

**Rituals:** returned as `TodayItem` rows (`kind: 'ritual'`, `memberIds: []`, type in `src/types/today.ts`) and shown in the home layout's Today list. The timeline layout does not show them.

**Settings** (`SettingsModal`, parent mode only -- the section is hidden and not saved otherwise): Season language select, Season select (Auto, Sinterklaas, Christmas, None), date inputs for `journaal_start`, `intocht`, `intocht_local`, `pakjesavond`, and a shoe-night list (add a date, tap a chip to remove it). Saved with the rest of the form through `updateSettings`; empty dates are dropped from the JSON. The modal reloads its form from `settings` every time it opens so a save never writes stale defaults over the season dates. Dates are per year: a parent re-enters them each autumn.

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

A red horizontal line with a dot indicates the current time. It updates every 60 seconds via `useNow()` (shared with the home layout), and `useFollowNowLine(currentTime, () => 160)` keeps it 160 px below the top of the scroll window. Position:

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
- Touch only: no hover-dependent UI, `whileTap` feedback, tap targets at least 44 px, body text at least 18 px in the home layout (past rows are deliberately 17 px).
- Every new data hook reloads on `useBoardRefresh().tick` and takes the date from `useBoardRefresh().today`, never `dayjs()`.
- Chores without a `scheduled_time` are **not shown** on the timeline or in the Today list.
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
| `HomeBoard` | `src/components/home/HomeBoard.tsx` | Board page, home layout |
| `TodayList` | `src/components/home/TodayList.tsx` | Merged Today rows with NOW line and Done buttons |
| `WhereaboutsClock` | `src/components/home/WhereaboutsClock.tsx` | SVG whereabouts clock, one hand per member |
| `WhereaboutsSheet` | `src/components/home/WhereaboutsSheet.tsx` | Pick a status for a member (manual override) |
| `PointsLegend` | `src/components/home/PointsLegend.tsx` | Colour dot, name, points and whereabouts per member |
| `MemberAvatar` | `src/components/home/MemberAvatar.tsx` | Photo, or emoji on the member colour |
| `TimelineChoreBoard` | `src/components/TimelineChoreBoard.tsx` | Board page, timeline layout |
| `ConfettiCelebration` | `src/components/ConfettiCelebration.tsx` | Confetti on chore completion |
| `TodaysScheduleCard` | `src/components/TodaysScheduleCard.tsx` | Schedule summary card (timeline layout) |
| `VerseOfTheDayCard` | `src/components/VerseOfTheDayCard.tsx` | Verse of the day: `card` (timeline) or one-line `strip` (home) |
| `CallFamilyButtons` | `src/components/CallFamilyButtons.tsx` | WhatsApp call pills in the tab bar (rendered by `App.tsx`) |
| `SeasonHero` | `src/components/SeasonHero.tsx` | Season hero: `full` (timeline) or `strip` (home) |
| `TodaysMeals` | (inline in TimelineChoreBoard.tsx) | Meal of the day display |
| `TodaysFun` | (inline in TimelineChoreBoard.tsx) | Fun activity display |

### Hooks Used

| Hook | Source | Data |
|---|---|---|
| `useTodayMeal` | `src/hooks/useMeals.ts` | Today's lunch and dinner from `meal_plans` |
| `useActivities` | `src/hooks/useActivities.ts` | Activities and planned activities |
| `useFunIdeas` | `src/hooks/useFunIdeas.ts` | Fun ideas (filtered for today's scheduled_date) |
| `useSeason` | `src/hooks/useSeason.ts` | Active season, hero, rituals, palette (context provided by `App.tsx`) |
| `useTodayItems` | `src/hooks/useTodayItems.ts` | Merged, sorted `TodayItem[]` for the home layout, plus today's dinner |
| `useScheduleEvents` | `src/hooks/useScheduleEvents.ts` | `schedule_events` via `dataGateway.listScheduleEvents`, filtered to today (`scheduleEventsForDay`); shared by `TodaysScheduleCard` and `useTodayItems` |
| `useGoogleCalendar` | `src/hooks/useGoogleCalendar.ts` | Read-only Google Calendar events from `/api/calendar` |
| `useNow` | `src/hooks/useNow.ts` | Current time, ticking every minute |
| `useFollowNowLine` | `src/hooks/useFollowNowLine.ts` | Auto-scroll that keeps `[data-now-line]` in view inside `[data-timeline-scroll]` |
| `useWhereabouts` | `src/hooks/useWhereabouts.ts` | Resolved whereabouts per member + `setStatus` (overrides/rules via `src/lib/whereaboutsApi.ts`, realtime on overrides) |
