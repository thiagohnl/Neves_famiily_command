# Front page redesign: whereabouts clock, today timeline, seasons

Paste each phase into Copilot agent mode as a separate task, in order. Each phase must finish with `npm run typecheck`, `npm run lint` and `npm run test` passing, plus an update to the matching file under `docs/directives/`.

## Context for every phase (read first)

* Stack: React 18, TypeScript, Vite, TailwindCSS 3, Supabase (anon access, RLS allows all), dayjs, framer-motion, lucide-react. Read `docs/directives/00-overview.md` and `07-data-model.md` before touching anything.
* Runs in Fully Kiosk on a 15.6 inch Android wall tablet at roughly 1280 by 800, viewed from about one metre. Touch only: no hover states, `whileTap` feedback only, tap targets at least 44 px, body text at least 18 px on the Board tab.
* Tabs (Board, Chores, Meal Plan, Schedule, Fun Ideas) and `CallFamilyButtons` in `App.tsx` stay exactly as they are. Only the content of the `board` tab changes.
* Data access goes through `src/lib/dataGateway.ts` and `src/lib/safeSupabase.ts` where existing code does; follow that pattern, never call `supabase` directly from a new component.
* Refresh model: `useBoardRefresh` provides `tick` and `today`. Every new hook must reload on `tick` and use `today`, never `dayjs()` directly for the date.
* Every new Supabase table gets a migration in `supabase/migrations/` with the same header comment style as `20251005140024_create_schedule_events_table.sql`, RLS enabled, and a permissive policy for `anon, authenticated`.
* Keep `TimelineChoreBoard.tsx` working. Add `board_layout: 'timeline' | 'home'` to `app_settings` (default `'home'`) and a toggle in `SettingsModal` so we can fall back.
* Interface language is English. Chore names stay whatever the parent typed (often Portuguese).
* Write Vitest tests next to the existing ones in `src/hooks/__tests__/` for every pure function you add (status resolution, countdown maths, item merging).

---

## Phase 1: Season engine (do this first, smallest build)

### Goal
The board changes look and adds a hero strip during a season (Sinterklaas, Christmas, birthdays), driven by dates, with yearly dates editable by a parent in Settings. Language of the season strings is a separate setting from the theme.

### Data model
Add to `app_settings` via migration:
* `language text default 'en'` with check in `('en','pt','nl')`
* `active_season text null` (manual override; null means auto by date)
* `season_dates jsonb default '{}'` holding per year values, for example
  `{"sinterklaas": {"intocht": "2026-11-14", "intocht_local": "2026-11-15", "pakjesavond": "2026-12-05", "shoe_nights": ["2026-11-09","2026-11-16","2026-11-23","2026-11-30"], "journaal_start": "2026-11-09"}}`

Update `AppSettings` in `src/types/index.ts` accordingly.

### Code
Create `src/seasons/`:
* `types.ts`: `Season { key; name; emoji; isActive(today, dates): boolean; palette: { bg; surface; accent; accentText; button }; hero?: (today, dates, t) => HeroSpec | null; rituals: (today, dates, t) => TodayItem[]; clockEmoji?: Partial<Record<Whereabout, string>> }`. `HeroSpec` is `{ emoji; headline; subline; chips: { label; value }[] }`.
* `sinterklaas.ts`: active from `journaal_start` to `pakjesavond` inclusive. Headline counts sleeps to `intocht` while before it, then sleeps to `pakjesavond`. Chips: Pakjesavond sleeps, and "Shoe tonight?" showing Yes when `today` is in `shoe_nights`. Rituals: an 18:00 item "Sinterklaasjournaal" every day from `journaal_start` to `pakjesavond` with emoji 📺, and a 19:30 item "Put your shoe out" with emoji 👟 on shoe nights. Palette: bg `#F6EFE4`, accent `#9B1B2A`, gold `#D4A017`.
* `christmas.ts`: active 6th to 26th of December, counts sleeps to the 25th, green and gold palette, no rituals yet.
* `birthdays.ts`: active on each `family_members.birth_date` anniversary (the column already exists), hero "Happy birthday Charlie!" with 🎂, uses the member's avatar colour. Only active for that one day.
* `index.ts`: `getActiveSeason(settings, today, members)` returning the manual override if set, else the first season whose `isActive` is true, else null.
* `i18n.ts`: a tiny dictionary `{ en, pt, nl }` only for season strings (sleeps, arrives, shoe tonight, put your shoe out). Do not translate the rest of the app in this phase. Export `t(key, lang, vars)`.
* `useSeason()` hook returning `{ season, hero, rituals, palette }`, reading `useAppSettings` and `useChores().familyMembers`.

Apply the palette by setting CSS variables on `document.documentElement` (`--season-bg`, `--season-accent`, `--season-accent-text`, `--season-gold`) in the same `useEffect` in `App.tsx` that handles `settings.theme`. Add Tailwind colours in `tailwind.config.js` that read those variables (`season.bg`, `season.accent`...). When no season is active, the variables fall back to the current light theme values so nothing visible changes.

### UI
* `SeasonHero.tsx`: full width strip under the tab bar, 44 px headline, emoji at 64 px, chips on the right. Rendered by the Board tab only when `hero` is not null. Static, no animation beyond a single fade in.
* In `SettingsModal`, parent mode only: a "Seasons" section with language select, manual override select (Auto, Sinterklaas, Christmas, None), and date inputs for the Sinterklaas keys plus a multi date input for shoe nights. Persist with `updateSettings`.

### Acceptance
* With `today` set to the 20th of October 2026 and the example dates, hero reads "25 more sleeps until Sinterklaas arrives!" in `en`, "Nog 25 nachtjes slapen tot Sinterklaas komt!" in `nl`.
* On the 9th of November the 18:00 Sinterklaasjournaal item appears in today's items and the shoe chip says Yes.
* Setting `active_season` to null outside any season leaves the board visually unchanged from today.
* Tests cover `getActiveSeason`, the sleeps maths across month boundaries, and `t()` fallback to English.

---

## Phase 2: Today timeline front page

### Goal
Replace the five summary cards plus per member column grid with one page: a whereabouts clock on the left (placeholder in this phase, real in Phase 3) and a single merged "Today" list on the right that mixes calendar events, playdates, chores and season rituals, with the current time line. Keep the old layout behind `board_layout = 'timeline'`.

### Data
Create `src/hooks/useTodayItems.ts` returning `TodayItem[]` sorted by start time:
```ts
export interface TodayItem {
  id: string;
  kind: 'chore' | 'event' | 'google' | 'activity' | 'fun' | 'meal' | 'ritual';
  emoji: string;
  title: string;
  subtitle?: string;        // "Until 17:30, Mama picks up", "Chore, 20 points"
  start: string;            // HH:mm
  end?: string;             // HH:mm
  memberIds: string[];      // empty means whole family
  color?: string;
  isPast: boolean;
  isNow: boolean;
  completable?: { choreId: string; points: number; assignedTo: string };
}
```
Sources, reusing existing hooks and logic without duplicating it:
* chores for today from `useChores` (same recurring day filter `TimelineChoreBoard` uses), `completable` set, subtitle "Chore, N points"
* `schedule_events` dated and recurring, extracted from `TodaysScheduleCard` into a shared `useScheduleEvents(today)` hook so both components use it
* Google Calendar via `useGoogleCalendar(today, today)`; emoji by keyword: playdate 🧒, school 🏫, dentist 🦷, church ⛪, work 💼, default 📅; a title containing "playdate" or "at X's" keeps the host name in the title
* planned activities and scheduled fun ideas from `useActivities` and `useFunIdeas` (same logic as `TodaysFun`)
* today's dinner from `useTodayMeal` as one 16:30 item "Dinner prep: <name>" only if a dinner is planned
* `rituals` from `useSeason()`

`isPast` and `isNow` use the minute ticker already in `TimelineChoreBoard`.

### UI
* `src/components/home/HomeBoard.tsx`: two column flex, left column fixed 470 px holding `WhereaboutsClock` (Phase 3; render `WhereaboutsClockPlaceholder` showing member avatars in a circle until then), right column the list.
* `src/components/home/TodayList.tsx`: rows. Past items are muted and struck through with a check icon, compact 17 px. Current and future items are cards with time (64 px column, 18 px bold), emoji, title 22 px bold, subtitle 16 px, and for `completable` items a green "Done!" button 52 px tall on the right that calls `onCompleteChore` and triggers the existing `ConfettiCelebration`. A red "NOW" line renders between past and upcoming items. The list scrolls inside its box and auto scrolls so the NOW line sits at the top third, reusing the `data-timeline-scroll` and user scroll suppression logic from `TimelineChoreBoard`.
* Header row of the right column: "Today" in a serif italic (add Lora from Google Fonts in `index.html`, Nunito for body) and a dinner chip on the right.
* Bottom strip: `VerseOfTheDayCard` content restyled as a single line strip, or the season hero when a season is active (hero above, verse below, both fit; if height is short, the verse hides first).
* Points move out of the hero into a four item legend under the clock (avatar colour dot, name, points). Leaderboard stays on the Chores tab.
* `App.tsx`: render `HomeBoard` when `settings.board_layout === 'home'`, else `TimelineChoreBoard`.

### Acceptance
* On a weekday the list shows school drop off and pick up from Google Calendar (muted once past), a playdate event with host name and end time, chores with Done buttons, and the dinner item.
* Tapping Done completes the chore, confetti fires, the item becomes muted without a full reload.
* Nothing in the Board tab needs hover to be usable.
* Fits 1280 by 800 without page scroll; only the list scrolls.
* Update `docs/directives/01-board.md` to describe both layouts.

---

## Phase 3: Whereabouts clock

### Goal
A Weasley style clock showing where each family member is, with one hand per member, resolved from manual overrides, phone presence, and calendar inference, in that priority order.

### Data
* Type `Whereabout = 'home' | 'school' | 'work' | 'church' | 'grandma' | 'playdate' | 'travelling' | 'sleeping'` with an emoji map (🏠 🏫 💼 ⛪ 👵 🧒 🚗 😴) in `src/constants/whereabouts.ts`.
* Migration `whereabouts_overrides`: `id uuid, member_id uuid references family_members, status text, source text check in ('manual','presence'), set_at timestamptz default now(), expires_at timestamptz null`. Index on `member_id`.
* Migration `whereabouts_rules`: `id uuid, member_id uuid null (null means any member), keyword text, status text, priority int default 0`. Seed rows: school → school, playdate → playdate, church → church, work or WFH → work (WFH maps to home, add a row for it with higher priority), vovó or grandma → grandma, travel or flight or train → travelling.

### Resolution (pure function, tested)
`resolveWhereabouts(members, overrides, rules, todayItems, now): Record<memberId, { status; source; label; until?: string }>`
1. Manual or presence override for the member with `expires_at` null or in the future wins; manual beats presence.
2. Otherwise the current `TodayItem` (isNow) assigned to the member, or to the whole family, whose title matches a rule keyword (case insensitive, highest priority first) gives the status and `until` from the item end.
3. Otherwise, for non parents between 20:00 and 07:00: sleeping. For everyone else: home.
Label is the emoji plus the status word.

### Presence endpoint (Vercel function)
`api/presence.ts`: `POST { member: string, status: Whereabout, ttl_minutes?: number }` with header `x-presence-key` matching `PRESENCE_SHARED_KEY` env var. Looks up the member by name (case insensitive), upserts a `whereabouts_overrides` row with `source = 'presence'` and `expires_at = now + ttl` (default 180 minutes). This is what Home Assistant, Tasker or an iOS Shortcut will call when a phone joins or leaves home WiFi. Document the curl example in `docs/directives/01-board.md`.

### UI
`src/components/home/WhereaboutsClock.tsx`:
* SVG 420 by 420: outer ring stroked with `--season-accent`, inner guide ring, eight labels at 45 degree steps starting with School at the top, clockwise: School, Playdate, Work, Travelling, Sleeping, Grandma's, Home, Church. Each label is emoji plus word, 19 px bold.
* One hand per member, a 6 px line from centre to radius 115 ending in a 26 px circle showing the member's `photo_url` (clip path) or `avatar` emoji fallback, with a 4 px white stroke. When two or more members share a status, shorten the extra hands by 45 px each so the avatars stack along the hand instead of overlapping. Hands animate with framer-motion `rotate` when status changes (spring, about 600 ms).
* Tapping a member's avatar opens a small sheet with the eight statuses as big emoji buttons plus "Clear"; choosing one writes a manual override with `expires_at` four hours ahead. Parents can set it for anyone; kids can set only their own (use `isParentMode` to decide whether the sheet lists all members).
* Under the clock, the points legend from Phase 2.
* `useWhereabouts()` hook: loads overrides and rules on `tick`, subscribes to Supabase realtime on `whereabouts_overrides` so a phone presence update moves the hand within seconds, and calls `resolveWhereabouts` with `useTodayItems()`.

### Acceptance
* On a Tuesday at 16:10 with the calendar events "School drop off" 08:00 to 08:30, "Playdate at Jonas's house" 15:30 to 17:30 assigned to Charlie, and a WFH block for Carol, the clock shows Charlie at Playdate with until 17:30, Carol at Home, Thiago at Work (from a "Zaandam office" rule row), Isabel at Home.
* A POST to `/api/presence` with `{ member: "Thiago", status: "home" }` moves Thiago's hand to Home without a page reload.
* A manual override beats a presence override; both expire.
* Tests for `resolveWhereabouts` covering priority order, keyword matching, the sleeping window, and expiry.

---

## Later (not now)
* Week view of the clock history ("where was everyone this week")
* Christmas rituals and an Advent style countdown
* Translating the whole interface, not just season strings
