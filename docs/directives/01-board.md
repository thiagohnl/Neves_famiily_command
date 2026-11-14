# 01 - Board

## Purpose

The Board tab is the main dashboard on the kitchen wall tablet (Fully Kiosk, ~1280×800, touch only, read from about a metre away). It has two layouts, chosen by `app_settings.board_layout` (Settings → Board Layout, open to everyone so the family can fall back):

| `board_layout` | Component | What it shows |
|---|---|---|
| `'home'` (default; also used when the value is missing) | `HomeBoard` | Whereabouts clock (plus the season calendar during Sinterklaas/Christmas) on the left, one merged "Today" list on the right |
| `'timeline'` | `TimelineChoreBoard` | Five summary cards above a per-member chore timeline |

In both, kids tap "Done!" to complete a chore and get the confetti celebration, and during a season (Sinterklaas, Christmas, birthdays) a hero strip and season colours are added. `App.tsx` picks the component; the tabs and `CallFamilyButtons` are identical in both.

## Home Layout (`board_layout = 'home'`)

**Files:** `src/components/home/` -- `HomeBoard.tsx`, `TodayList.tsx`, `WhereaboutsClock.tsx`, `WhereaboutsSheet.tsx`, `SeasonCalendar.tsx`, `MemberAvatar.tsx`. Data from `src/hooks/useTodayItems.ts`, merge logic in `src/lib/todayItems.ts` (pure, tested in `src/hooks/__tests__/todayItems.test.ts`).

**Layout.** On `md` and up: a row sized `h-[calc(100vh-8.5rem)]` with `-mt-2 -mb-4` (it borrows 24 px of the main padding so the 440 px clock and a four-row season calendar fit at 1280×800); the page never scrolls, only the list does. Fonts: Nunito for the body (`font-body`), Lora italic for the "Today" heading (`font-display`), loaded from Google Fonts in `index.html` and applied to this layout only.
- **Left column** (fixed 470 px, hidden below `md`): the `WhereaboutsClock` (see below) at its full size, and under it the `SeasonCalendar` while Sinterklaas or Christmas runs (see Season calendar). The points legend was removed on 2026-11-14; points show on the chore cards and the leaderboard stays on the Chores tab.
- **Right column:**
  - Header row: serif italic "Today" (no date), the journaal banner when due, and a dinner chip on the right that opens `RecipeViewModal` when the dinner has a recipe.
  - The scrolling list.
  - Bottom strip: `SeasonHero` (`size="strip"`) when a season is active, then `VerseOfTheDayCard variant="strip"` (one truncated line). With a hero showing and a viewport under 760 px tall, the verse hides first.
- **Journaal banner:** from 17:50 until 18:00, when today's list has a Sinterklaasjournaal row, a static accent pill "📺 Sinterklaasjournaal starts soon" (season language) appears next to "Today" (`journaalSoonBanner`). No sound, no full-screen animation.

**`useTodayItems(chores, familyMembers)`** returns `{ items, dinner, nowMinutes }`. Chores are passed in from App's `useChores` state (calling `useChores()` again would be a second copy that misses completions); every other source reloads on the board refresh `tick`, and the date always comes from `useBoardRefresh().today`. Sources:

| Kind | Source | Item |
|---|---|---|
| `chore` | `chores` prop | Same day filter as the timeline (has `scheduled_time`; no `recurring_days` or includes today's weekday). Completed chores stay only if `completed_at` is today, shown as past. Subtitle "Chore, N points", colour = member colour, `completable` while open. |
| `event` | `useScheduleEvents(today)` | Dated today or recurring on today's weekday; `memberIds` = `assigned_member_ids`, subtitle "Until HH:mm" + notes. |
| `google` | `useGoogleCalendar(today, today)` | Title kept as typed (so "Playdate at Jonas's house" keeps the host); subtitle "Until HH:mm" + location; `memberIds` = family members whose name appears as a whole word in the title (Google events have no assignees). All-day events become `allDay` items. |
| `activity` | `useActivities` | Planned for today plus recurring on today's weekday, merged into one item per activity with all its members. No start time → `allDay`. |
| `fun` | `useFunIdeas` | Ideas with `scheduled_date` = today, `allDay`. |
| `meal` | `useTodayMeal` | One 16:30 "Dinner prep: <name>" item, only when a dinner is planned and no schedule/Google item today mentions dinner (`dinner`, `jantar`, `avondeten`) -- that entry already covers it. |
| `ritual` | `useSeason().rituals` | Season rituals, e.g. 18:00-18:10 Sinterklaasjournaal. A ritual with `dedupeKeyword` is dropped when a schedule or Google item today has that word in its title (`dedupeRituals`), so a "Sinterklaasjournaal" calendar entry replaces the built-in row. |

Emoji for events and Google items come from the title: playdate 🧒, school/drop off/pick up 🏫, dentist 🦷, church ⛪, work/office 💼, otherwise 📅 (Portuguese and Dutch keywords included).

**Status and order** (`finalizeTodayItems`, recomputed every minute from `useNow()`):
- An item is *now* from its start until its end; items without an end count as 30 minutes long. It is *past* once the end has gone by.
- Chores are past only when completed, so an overdue chore keeps its Done button.
- All-day items are listed first, are never past, and count as "now" all day.
- Timed items follow by start time.
- The red NOW line (`nowLineIndex`) goes before the first timed item that hasn't started yet.

**`TodayList` rows:**
- **Past:** compact 17 px row, muted grey, green check, time, emoji, the members' faces (22 px, faded -- so two kids' copies of one chore stay distinguishable) and struck-through title.
- **Current and upcoming:** white card with a left border in the item colour, 64 px time column (18 px bold, "All day" for all-day items), emoji, 22 px bold title, the members' faces, a 16 px subtitle, and for open chores a bold 20 px "+20" points pill and a green 52 px "Done!" button. An item in progress gets a ring in `season.accent`.
- **Done animation:** tapping Done calls `onComplete` straight away and the pill floats up and fades (framer-motion, 600 ms, `PILL_FLY_MS`). The card stays up (button hidden) until the animation ends, even if the completion lands first and the row has already turned past.
- **Feedback:** taps use `whileTap` only; nothing needs hover.

**Completing a chore:** Done → `onCompleteChore` → `useChores.completeChore(choreId, points, assignedTo, seasonGoal?)`.
- App passes `seasonGoal = { seasonKey, year }` while Sinterklaas or Christmas runs (`useSeason().goalSeason`).
- On success it updates the chore (`is_completed`, `completed_at`) and the member's points in local state straight away, then refetches quietly (`loadData(true)`).
- With a `seasonGoal` it also calls the `increment_season_goal` RPC. A failure there (no goal, table missing) is logged and does not fail the completion.
- The row turns muted without a reload; `HomeBoard` shows `ConfettiCelebration` and bumps the child's goal locally so the hero chip moves at once.

**Auto-scroll:** the list container carries `data-timeline-scroll` and the NOW line `data-now-line`; `useFollowNowLine(nowMinutes, c => c.clientHeight / 3)` keeps the line a third of the way down. The trigger is `nowMinutes|items.length`, so it also re-follows when late-loading sources (calendar, schedule) change the list. It pauses for 2 minutes after a manual scroll. The same hook drives the timeline layout.

## Season Calendar (home layout)

`SeasonCalendar` (`src/components/home/SeasonCalendar.tsx`) sits under the clock while Sinterklaas or Christmas runs (`useSeason().goalSeason`; it stays on a birthday during the season). The date map comes from `seasonCalendar()` in `src/seasons/calendar.ts` (pure, tested in `src/hooks/__tests__/seasonCalendar.test.ts`).

| Season | Grid runs | Emoji |
|---|---|---|
| Sinterklaas | national `intocht` → `pakjesavond`, so today is on the grid from day one (22 cells in 2026: 14 Nov – 5 Dec; 🎁 is cell 22) | One emoji per day, first match wins: family birthday 🎂 > Pakjesavond 🎁 > shoe night 🥾 > `intocht` / `intocht_local` 🚢 > Saturday/Sunday 🍪 > weekday 📺. In 2026 with a shoe night on the 15th: 🚢 on the 14th, 🥾 on the 15th. |
| Christmas | 1 – 25 December | Family birthday 🎂 > the 25th 🎄 > an all-day Google event whose title contains "London" or "Eurostar" ✈️ > 🎅 |

**Grid:**
- Cells run from the season's first day in date order, 7 per row, left to right; no weekday alignment and no blank cells. Sinterklaas and Christmas both fill 4 rows.
- Cells are 44 px with 2 px gaps, emoji at 26 px. No dates or weekday text; each cell has an aria label.
- **Past days:** emoji at 40 % opacity with a ✖ overlay in the season accent. They always read as done, whether or not they were tapped.
- **Today:** a 4 px `season.accent` ring that pulses once every 3 seconds (framer-motion: 0.8 s pulse, 2.2 s pause), with a small 👇 above the cell.
- **Next special cell:** only the next 🥾, 🎂 or 🎁 after today (🎄 at Christmas), whichever is nearest, hops 4 px every 3 seconds (`bounceDay`). Nothing else in the grid moves.
- **Future days:** full opacity.
- Shoe nights and the final day get a faint gold background (a birthday on such a day keeps it).
- **On a family birthday** the grid is replaced by one large cell, "🎂 TODAY" (`BirthdayTodayCell`, season language). The next day the grid is back with its crossed days.

**Crossing off:** only today's cell is a button (`whileTap`). A tap toggles it (so a mistaken tap can be undone) and is allowed only for a day in the grid that is today or earlier (`canCrossDay`). Crossed days are stored in `app_settings.season_dates[year][season].crossed_days` through `useSeasonCrossing` (owned by App, which holds the settings) and survive a reload. After the date rolls over, and on load to catch up after the tablet slept, every past day that is not crossed yet is added automatically (`missingCrossedDays`). That runs once per day and season, and only after the saved settings have loaded.

**Next special day:** one 20 px line under the grid, from `nextSpecialLine()` in the season language. It names the next 🥾, 🎂 or 🎁 (🎄 or ✈️ at Christmas) from today on: "🥾 Wellies tonight!", "🥾 Wellies tomorrow night!", "🥾 Wellies in 3 sleeps", "🎂 3 sleeps until Isabel's birthday", "🎁 4 more sleeps", "🎄 19 more sleeps", "✈️ London in 3 sleeps". The arrival is told by the hero, not here. Wellies and birthday lines come from the same functions (and so the same i18n keys) as the hero chips (`welliesText`, `birthdayCountdownText`), so the two never disagree.

**Child-readable time:** no weekday names anywhere on the Board tab. Days ahead are "tonight" (same day), "tomorrow" (1 sleep) or "in N sleeps" (nl "vanavond", "morgen", "over N nachtjes"; pt "hoje à noite", "amanhã", "em N sonos").

**Data:** Christmas ✈️ days use a second `useGoogleCalendar(1 Dec, 25 Dec)` call in `HomeBoard`; outside Christmas that call asks for today only.

## Season Goals

A child can save up chore points for a reward during a season, e.g. "Chocolate letter C" for Sinterklaas.
- **Storage:** table `season_goals` (one row per child, season and year).
- **Earning:** every chore completed while the season runs adds its points (see Completing a chore).
- **Hero:** shows one chip per child with a target, e.g. "Charlie 🍫 62%" (🎁 for Christmas), capped at 100 %. For Sinterklaas the chips replace the "🥾 Wellies in N sleeps" chip; on a shoe night "🥾 Wellies tonight!" wins and the goal chips are hidden that evening.
- **Data:** `useSeasonGoals(year)` loads goals through `src/lib/seasonGoalsApi.ts`. It reloads on the refresh `tick` and right after Settings saves goals (a `season-goals-changed` window event).
- **Settings:** parents set the target and reward label per child, per season, in Settings → Season goals.

## Birthdays

Driven by `family_members.birth_date` (members only; no other people). Logic in `src/seasons/birthdays.ts`, tested in `src/hooks/__tests__/birthdays.test.ts`.

**Names:** in season strings a parent is "Papa" or "Mama" (by `gender`; the kids' words, and the names on the call pills), a child is called by name (`displayName`). So Thiago's chip reads "🎂 1 sleep until Papa's birthday".

**Priority:** on the day the birthday season wins over Sinterklaas, Christmas and even a forced `active_season`, for that day only. Only `'none'` turns it off. The calendar, goals and rituals of the season underneath carry on (`goalSeason`).

**The week before:** from 7 sleeps to 1, the running season's hero gains a one-line chip, "🎂 3 sleeps until Isabel's birthday" (`birthdayRunUpChip`, nearest birthday wins). On the season calendar the day already shows 🎂.

**On the day (everyone):**
- **Look:** palette from the member's colour (`memberColor`), cream background `#FFF8EC` with a static confetti-dot pattern (`palette.pattern = 'confetti'` → class `season-confetti` on `<html>`, CSS in `index.css`).
- **Hero:** the member's photo (or emoji avatar) at 112 px (140 px in the timeline layout), and "🎂 Isabel is 4 today!" with the age at 96 px (`headlineBig`). With `show_age = false`: "🎂 Happy birthday Isabel!". Several birthdays on one day: "🎂 Happy birthday Charlie & Isabel!". The verse strip hides on the day so the list keeps its room.
- **Clock:** a 👑 sits on the member's face. Tapping that face throws confetti and a hurray instead of opening the whereabouts sheet (parents can still set it from another face in parent mode).
- **Confetti:** `ConfettiCelebration` with `silent`. Once, silently, at the first render of the day (per device, flag `birthday-confetti-<date>` in `localStorage`).
- **Hurray (family's choice, the one sound on the board):** every tap of the birthday face or the hero photo, on the birthday only, throws confetti and plays `playHurray` (`src/lib/hurray.ts`): a party horn and ta-da fanfare made with Web Audio, plus a spoken "Hip hip hooray!" / "Hiep hiep hoera!" / "Viva! Parabéns!" where the device has speech synthesis. Sound only ever starts from a tap (the WebView blocks it otherwise).
- **Rituals:** 16:00 🎂 Cake time; 17:30–18:00 📞 Call Vovó, which pulses the Vovó call pill in the tab bar while current (`pulseContact`, `pulsingContacts`).
- **Gift chores:** every other child gets "🎁 Make Isabel's day", 50 points, completable. These aren't rows in `chores`: the item's `completable.choreId` is `bonus:birthday:<member>:<child>:<date>`, `useChores.completeChore` takes the season_bonus path (points and season goal only, no chores update), and App records the id in `season_dates[year].bonuses.done` (`useSeasonBonuses.markDone`) so it shows as done and can't be done twice.
- **Goal bonus:** the birthday member's running season goal gets `earned_points += 50` once per birthday (`useSeasonBonuses`; key `goal:<member>:<date>` is recorded before the increment, so it never pays twice).

**On the day, children only:** their own chores are hidden (`choresOffFor` → `buildTodayItems`) and one non-completable all-day row "🎉 Day off for Isabel" shows instead; 08:00 🧁 "Traktatie at school or daycare". The evening before, parents get 20:00 🧁 "Prepare traktatie". Adults get none of these (their chores stay).

**Writes:** crossing days, the midnight auto-cross, gift chores and the goal bonus all write `season_dates` through `useSeasonDatesWriter`, which serialises the writes and applies each change to the result of the previous one (they can fire on the same tick on a birthday morning).

**Members editor:** `EditFamilyMembers` has a "Birthday on the board" switch for `show_age`.

## Whereabouts Clock (home layout)

A Weasley-style clock: one hand per member pointing at where they are.

**Statuses** (`src/constants/whereabouts.ts`): `home` 🏠, `school` 🏫, `work` 💼, `church` ⛪, `playdate` 🧒, `football` ⚽, `sleeping` 😴. (Grandma's and Travelling were removed on 2026-10-20 at the family's request; Football was added.) A season can swap emoji via `Season.clockEmoji`.

**Resolution** (`resolveWhereabouts` in `src/lib/whereabouts.ts`, pure, tested in `src/hooks/__tests__/whereabouts.test.ts`), per member, first match wins:
1. **Override** from `whereabouts_overrides` with `expires_at` null or in the future. `manual` beats `presence`; within a source the newest `set_at` wins.
2. **Calendar**: a Today item that is happening now (`isNow`) and is assigned to the member or to the whole family (`memberIds` empty), whose title contains a `whereabouts_rules` keyword. Rules apply to everyone (`member_id` null) or to one member; the highest `priority` wins. Keywords match case-insensitively as whole words, accent-safe ("vovó" matches, "work" does not match "Homework"). `until` = the item's end time.
3. **Default**: children (`is_parent = false`) are `sleeping` from 20:00 to 07:00; otherwise `home`.

Each result is `{ status, source: 'manual' | 'presence' | 'calendar' | 'default', label: '🧒 Playdate', until? }`. Expiry is re-checked every minute (`useNow`), so a lapsed override hands back to the calendar without a reload.

**`useWhereabouts(familyMembers, todayItems)`** (`src/hooks/useWhereabouts.ts`): loads active overrides and rules through `src/lib/whereaboutsApi.ts` on every refresh `tick`, re-loads overrides on any Supabase realtime change to `whereabouts_overrides` (so a phone update moves the hand within seconds), and resolves with the Today items `HomeBoard` already has (passed in rather than calling `useTodayItems()` a second time). Returns `{ whereabouts, setStatus(memberId, status | null) }`.

**`WhereaboutsClock`** (`src/components/home/WhereaboutsClock.tsx`): a 440×440 SVG with an outer ring stroked `--season-accent`, a dashed inner guide ring, and seven emoji + word labels (18 px bold) in equal steps (≈51.4°), clockwise from the top: School, Playdate, Work, Football, Sleeping, Home, Church. The short words (Work, Home) sit at the sides, where a label runs straight towards the faces. Label positions are fixed per status (`LABEL_POS`, mirrored pairs): side and diagonal labels are anchored on their outer edge and grow inwards, staying ~10 px inside the ring and clear of a face on their hand (the tablet renders text wider than desktop Chrome; the first version overflowed there). Changing the set of statuses means re-placing `LABEL_POS` and a migration for the two `status` check constraints.
- **Hands:** each is a 6 px line in the member colour from the centre to radius 100 (short enough that a face never covers a label), ending in the member's photo (circular clip) or emoji avatar on their colour, with a white edge. The avatar is counter-rotated so faces stay upright.
- **Shared status** (`handSlots`, by how many share it):
  - 1: full hand, 26 px face radius.
  - 2: the second hand is 45 px shorter so the faces stack along it.
  - 3: a cluster at ±15° (full length) plus one at 56 px, 22 px faces.
  - 4: ±15° at full length plus ±27° at 56 px, 21 px faces.
  - 5 or more: 16 px faces spread over ±30°.
  - Clusters stay under ±30° so nobody looks as if they point at the neighbouring status.
- **Motion:** hands rotate with a framer-motion spring and take the short way round.
- **Tap:** tapping a face opens the sheet.

**Where the clock gets the family's routine.** Besides taps on the board and phone presence, the clock only knows what's on today's list right now. Put regular places in as calendar entries:
- **Recurring routine** (school, daycare, office days): add a recurring event on the **Schedule** tab, e.g. "School", Mon–Fri 08:30–15:00, assigned to Charlie. "Daycare" assigned to Isabel works the same way (daycare/creche/kinderopvang/BSO count as School).
- **One-off days:** a Google Calendar event whose title contains a keyword *and* the person's name, e.g. "Carol WFH" or "Thiago Zaandam office". Without a name, an event counts for the whole family.
- **Just today:** tap the face on the clock (4 hours).

Every such entry also appears as a row in the Today list.

**`WhereaboutsSheet`**: "Where is <name>?" with the seven statuses as large emoji buttons (96 px tall) and "Clear".
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
  - `status`: one of the seven statuses (`home`, `school`, `work`, `church`, `playdate`, `football`, `sleeping`), or `"clear"` to remove that member's presence row.
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
| `types.ts` | `Season { key, name, emoji, isActive(today, dates), palette, hero?(today, dates, t, ctx), rituals(today, dates, t), clockEmoji? }`, `HeroSpec { emoji, headline, subline, chips[] }`, `SeasonPalette { bg, surface, accent, accentText, button, gold }`, `HeroContext { calendar, goals }` (today's schedule/Google entries and the children's goals; `EMPTY_HERO_CONTEXT` when unknown) |
| `sinterklaas.ts` | See "Sinterklaas" below. |
| `christmas.ts` | Active 6–26 December every year (from the day after Pakjesavond). Headline "🎄 N sleeps until Christmas" ("Merry Christmas!" from the 25th). Palette green `#1F5B3F`, gold `#D4A017`, cream background `#FBF6EA`. Chips: the children's goals (🎁) when set. No rituals yet. Goals use `season_key 'christmas'` with their own targets. |
| `store.ts` | `season_dates` by year: `normalizeSeasonDates` (also accepts the old flat shape and moves it under its Pakjesavond's year, else 2026), `datesForYear(raw, year)` (computed defaults + stored values; stored wins, empty strings count as unset), `withSeasonEntry`, `crossedDays`, `withCrossedDays`. |
| `calendar.ts` | Season calendar under the clock: `seasonCalendar` (with `CalendarBirthday[]` for 🎂), `canCrossDay`, `missingCrossedDays`, `nextSpecialLine`. |
| `goals.ts` | `goalPercent`, `goalChips(goals, emoji)` for the hero. |
| `birthdays.ts` | See "Birthdays" above. `birthdaySeason`, `birthdayDay` (rows, gift chores, `choresOffFor`), `birthdayRunUpChip`, `ageOn`, `nextBirthday`, `birthdayIn` (29 Feb → 28 Feb in non-leap years), `displayName`, `isSeasonBonusId`. Accent is the member's colour from `src/constants/memberColors.ts` (by list position, same as the Schedule tab). |
| `dates.ts` | `sleepsUntil(today, target)` counts calendar nights via UTC day numbers, so DST changes never add or lose a sleep. `addDays`, `eachDay`, `isoWeekday`. `defaultSinterklaasDates(year)`: see "Sinterklaas" below. |
| `i18n.ts` | `t(key, lang, vars)` for season strings only (`en`, `pt`, `nl`). `{var}` placeholders; a `<key>_one` entry is used when `vars.n === 1`. Unknown language or missing key falls back to English. `translatorFor(lang)` carries `.lang`. There are deliberately no weekday names (see Child-readable time). |
| `index.ts` | `getActiveSeason(settings, today, members)`: `active_season = 'none'` → no season; otherwise a family birthday today wins; then `'sinterklaas'`/`'christmas'` → that season regardless of date; otherwise (null or unknown value) Sinterklaas → Christmas by date. `getGoalSeason()` is the same without birthdays (drives the calendar and goals). `resolveSeasonState()` uses this year's dates from `datesForYear` and adds the hero (plus the birthday run-up chip), `heroFor(ctx)`, rituals (the goal season's rituals too on a birthday, so the journaal still airs, plus the birthday rows), palette, `dates`, `year`, `goalSeason`, `translate`, `birthdayIds` and `choresOffFor`. `GOAL_SEASONS` lists Sinterklaas and Christmas. |
| `palette.ts` | `applySeasonPalette(root, palette)` sets/removes the CSS variables and the `season-active` class on `<html>`, plus `season-confetti` when `palette.pattern === 'confetti'`. |

**Sinterklaas** (`sinterklaas.ts`):
- **Dates:** each year's dates are computed by `defaultSinterklaasDates(year)` unless a parent set them for that year:
  - `intocht`: the first Saturday strictly after 11 November (16 Nov 2024, 15 Nov 2025, 14 Nov 2026, 13 Nov 2027).
  - `intocht_local`: the Sunday after it (Haarlem).
  - `journaal_start`: the Monday before the intocht.
  - `pakjesavond`: 5 December.
  - `shoe_nights`: none; parents choose them.
- **Active:** `journaal_start` → `pakjesavond` inclusive.
- **Headline and subline:**

  | Day | Headline | Subline |
  |---|---|---|
  | Before `intocht` | "N more sleeps until Sinterklaas arrives!" | "N sleeps until he visits our town" |
  | `intocht` (national, 14 Nov 2026) | "🚢 Sinterklaas is in the Netherlands!" | "Tomorrow he sails into Haarlem" |
  | `intocht_local` (15 Nov 2026) | "🚢 Sinterklaas comes to Haarlem today!" | Time of today's first schedule/Google entry with "intocht" in its title ("At 12:30"), else "Around 13:00" |
  | After, to Pakjesavond | "N more sleeps until Pakjesavond!" / "It's Pakjesavond tonight!" | "Sinterklaasjournaal tonight at 18:00" |

  The arrival sublines come from `localArrivalText`, which the calendar line also uses.
- **Chips:** Pakjesavond sleeps, then a one-line wellies chip from `welliesText`: "🥾 Wellies tonight!" (0 sleeps), "🥾 Wellies tomorrow night!" (1), "🥾 Wellies in N sleeps" (2+), hidden when no shoe nights are left. On a shoe night it turns gold from 16:00 (`chip.gold`, needs `nowMinutes` in the hero context, which `HomeBoard` passes). On nights that aren't shoe nights, when season goals exist, one chip per child replaces it ("Charlie 🍫 62%"). In the 7 days before a family birthday the birthday chip is added.
- **The morning after a shoe night,** until 09:00, the subline reads "🥾 Look in your wellies!".
- **Rituals:**
  - 📺 Sinterklaasjournaal, 18:00–18:10, every day from `journaal_start` to `pakjesavond` inclusive, subtitle "NPO 3, episode N of M" (`journaalEpisode`; 14 Nov 2026 is episode 6 of 27). It carries `dedupeKeyword: 'sinterklaasjournaal'`.
  - On `shoe_nights`, each child gets a 19:00 chore "🥾 Put your wellies out" (nl "Zet je schoen", pt "Deixa a tua bota") with a Done button, 10 points (`welliesChores`). Like the birthday gifts it is not a row in `chores`: `completable.choreId` is `bonus:wellies:<child>:<date>`, completed through the season_bonus path and recorded in `season_dates[year].bonuses.done`.
- **Palette:** bg `#F6EFE4`, accent `#9B1B2A`, gold `#D4A017`.
- **Banner:** `journaalSoonBanner(items, nowMinutes, t)` gives the 17:50–18:00 "starts soon" text.

**Hook:** `useSeason()` returns the `SeasonState` from `SeasonContext`: `{ season, hero, heroFor, rituals, palette, dates, year, goalSeason, translate, birthdayIds, choresOffFor }`. `HomeBoard` renders `heroFor({ calendar, goals })`. The timeline layout uses `hero`, which has no calendar or goals. `App.tsx` owns the single source (`useSeasonSource(settings, familyMembers, boardRefresh.today)`) because it already holds the settings and members -- a second `useAppSettings()` instance would be separate state that never sees a Settings save. The season re-resolves when `today` rolls over at midnight.

**Palette:** applied in the same `useEffect` in `App.tsx` that handles `settings.theme`. Variables `--season-bg`, `--season-surface`, `--season-accent`, `--season-accent-text`, `--season-button`, `--season-gold`; Tailwind colours `season.bg`, `season.surface`, `season.accent`, `season.accent-text`, `season.button`, `season.gold` (e.g. `bg-season-accent`). Fallback values (light theme: white, purple `#8B5CF6`, amber) are defined on `:root` in `index.css`. The page background is tinted only while `season-active` is set and the theme is not dark.

**SeasonHero** (`src/components/SeasonHero.tsx`): rendered only when `hero` is not null. Accent background with gold border, emoji (or the birthday photo, tappable for confetti), headline (with an optional 96 px part, `headlineBig`), optional subline, chips on the right (a chip with an empty label is one line). Single opacity fade-in, no other animation. Sizes: `full` (64 px emoji, 44 px headline; timeline layout) and `strip` (48 px emoji, 28 px headline; home layout's narrower right column).

**Rituals:** returned as `TodayItem` rows (`kind: 'ritual'`, `memberIds: []`, type in `src/types/today.ts`) and shown in the home layout's Today list. The timeline layout does not show them.

**Settings** (`SettingsModal`, parent mode only -- these sections are hidden and not saved otherwise):
- **Seasons:**
  - Season language select and Season select (Auto, Sinterklaas, Christmas, None).
  - Date inputs for this year's `journaal_start`, `intocht`, `intocht_local`, `pakjesavond`. The computed default is the input's placeholder and is also written under each field ("Default: Sat 14 Nov (in use)"), because Android date inputs don't show placeholders.
  - "Reset to defaults" clears the four dates so the computed ones apply. Shoe nights and crossed days are kept.
  - Shoe-night list: add a date, tap a chip to remove it.
- **Saving the season fields:** saved with the rest of the form through `updateSettings` into `season_dates[<this year>].sinterklaas` (`withSeasonEntry`). Other years, Christmas and `crossed_days` are kept; empty dates are dropped.
- **Season goals:** a Sinterklaas / Christmas switch (defaults to the running season) and, per child, a reward label (placeholder "Chocolate letter C") and a target.
  - Shows what the child has earned so far.
  - Saved on Save: a target above 0 upserts the goal (`earned_points` untouched); clearing a target deletes it.
- **Reloading:** the modal reloads its form from `settings` (and this year's goals) every time it opens, so a save never writes stale values back.

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
| `SeasonCalendar` | `src/components/home/SeasonCalendar.tsx` | Season calendar under the clock (Sinterklaas / advent) |
| `BirthdayTodayCell` | `src/components/home/BirthdayTodayCell.tsx` | "🎂 TODAY" in the calendar's place on a birthday |
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
| `useSeasonGoals` | `src/hooks/useSeasonGoals.ts` | This year's `season_goals` via `src/lib/seasonGoalsApi.ts`; `bump` for an instant update after a completion |
| `useSeasonCrossing` | `src/hooks/useSeasonCrossing.ts` | Crossed calendar days and `crossDay`, plus the midnight auto-cross (owned by App) |
| `useSeasonBonuses` | `src/hooks/useSeasonBonuses.ts` | Records done generated chores (birthday gifts, wellies); gives the birthday goal bonus once (owned by App) |
| `useSeasonDatesWriter` | `src/hooks/useSeasonDatesWriter.ts` | Serialised writes to `app_settings.season_dates` |
| `useWhereabouts` | `src/hooks/useWhereabouts.ts` | Resolved whereabouts per member + `setStatus` (overrides/rules via `src/lib/whereaboutsApi.ts`, realtime on overrides) |
