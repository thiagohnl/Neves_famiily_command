# Family Chore Board - What We're Building

## What Is This?

A family organizer app that lives in your web browser. The whole family uses it on a phone, tablet, or computer to:

- See **who needs to do what today** (chores on a timeline)
- **Plan meals** for the week
- Keep a **family schedule** of events
- Collect **fun ideas** for things to do together
- **Earn points** when chores get done (makes it fun for kids!)

Parents get a special **locked mode** (PIN code) to manage everything. Kids can only see the board and mark chores as done.

---

## The Pages

The app has **5 main pages** (tabs at the top) plus a few popups:

### Page 1: Board (the home page)

This is what you see when you open the app.

**Top section — 4 colorful summary cards:**
- **Family Progress** (purple) — Everyone's name, photo, and points
- **Meal of the Day** (orange) — What's for lunch and dinner today
- **Today's Fun** (green) — Any fun activities planned for today
- **Today's Schedule** (blue) — Upcoming events

**Bottom section — Timeline:**
- A big calendar-style grid showing hours down the left side (7 AM to 10 PM)
- Each family member gets their own column
- Chores appear as cards in the right time slot and column
- A red line shows the current time
- Each chore card shows the emoji, name, and points
- **"Done!" button** on each chore — tap it and confetti explodes!

### Page 2: Chores (parents only)

Where parents create and manage chores.

**What you see:**
- A green "Add Chore" button at the top
- Filter dropdowns to show specific family members or completed/pending chores
- A grid of chore cards

**Each chore card shows:**
- Emoji + name (like "🧹 Sweep the kitchen")
- Who it's assigned to
- How many points it's worth (5 = easy, 10 = medium, 20 = hard)
- Which days it repeats (Mon, Wed, Fri, etc.)
- Time range if it has one
- Edit (pencil) and Delete (trash) buttons
- "Mark Complete" button

**Adding a chore — the form has:**
- Chore name
- Assign to (pick one or more family members)
- Recurring days (tap the days of the week)
- Points (Easy 5 / Medium 10 / Hard 20)
- Start time and end time
- Emoji picker

### Page 3: Meal Plan

Plan what the family eats all week.

**What you see:**
- A week calendar with 3 rows per day: Breakfast, Lunch, Dinner
- Tap an empty slot to plan a meal
- A library of saved meals you can reuse
- A freezer inventory (what's in the freezer right now)
- Meal suggestions based on family favorites
- A "Meal Quest" game that gives bonus points for trying new things

**Buttons:**
- "Add Meal" — save a new meal to your library
- "Add Freezer Item" — track what's in the freezer
- Favorite button (heart) on each saved meal
- Delete button on planned meals

### Page 4: Schedule (parents only)

A weekly calendar for family events and activities.

**What you see:**
- Week view with days across the top (Mon–Sun)
- Hours down the left side (7 AM – 10 PM)
- Colored blocks for each event
- Left/right arrows to move between weeks

**Adding an event — the form has:**
- Event title
- Start time and end time
- Assign to family members
- Recurring (yes/no) + which days
- Color picker (8 colors)
- Notes

### Page 5: Fun Ideas

A bucket list of fun things the family wants to do.

**What you see:**
- 3 stats cards: Total Ideas, Favorites, Categories
- Filter by category (Outdoor, Indoor, Sports, Arts, Food, etc.)
- "Favorites Only" toggle
- Grid of idea cards

**Each idea card shows:**
- Emoji + name
- Category and cost ($, $$, $$$)
- Location + Google Maps link
- Scheduled date if planned
- Heart (favorite), Calendar (schedule), Edit, Delete buttons

### Popup: Settings

Opens from the gear icon in the header.

- **App Title** — Change the name shown at the top (e.g., "Neves Family Board")
- **Theme** — Pick Light mode, Dark mode, or Kids mode (colorful!)
- **Email Summaries** — Toggle weekly progress emails on/off
- Save and Reset buttons

### Popup: Parent PIN

Opens when a parent taps the lock icon.

- Type a 4-digit PIN to unlock parent features
- Shows/hides the PIN with an eye button
- Wrong PIN shows a red error message

### Screen: Edit Family Members

Full-screen editor for managing the family.

- List of all family members
- Each member shows: photo/avatar, name, points
- Upload a photo for each person
- Add, edit, or delete members
- Pick an emoji avatar

---

## What It Looks Like

### Colors & Style
- **Clean and modern** — rounded corners, soft shadows, lots of white space
- **Purple/blue** for main actions and active tabs
- **Green** for success and "add" buttons
- **Red** for delete and errors
- **Orange/yellow** for fun and food-related things
- **Colorful gradient banners** at the top of each page

### Themes
- **Light mode** — White background, clean and bright
- **Dark mode** — Dark gray background, easy on the eyes
- **Kids mode** — Bright red, teal, and yellow. Fun and colorful!

### Animations
- **Confetti** when a chore is marked done
- **Smooth sliding** when opening/closing forms and modals
- **Hover effects** on buttons and cards

### Layout
- Works on phones, tablets, and computers
- Cards stack in 1 column on phones, 3 columns on bigger screens
- Header and tabs stick to the top when scrolling

---

## 3 Steps to Build It

### Step 1: Make It Look Pretty (Fake Data)

Build all the pages with **hardcoded fake data** — no database, no real saving.
The goal is to get the look and feel right before connecting anything.

**What to build:**
1. The app shell — header with title, online badge, settings button, parent toggle
2. Tab navigation — 5 tabs that switch between pages
3. **Board page** — 4 summary cards + timeline grid with fake chores for 3 fake family members
4. **Chores page** — grid of 6 fake chore cards + the add/edit form (doesn't save yet)
5. **Meal Plan page** — week calendar with a few fake planned meals + saved meals list
6. **Schedule page** — week grid with 4 fake events in different colors
7. **Fun Ideas page** — stats cards + grid of 5 fake idea cards
8. **Settings popup** — theme picker that actually changes the look (light/dark/kids)
9. **Parent PIN popup** — the PIN form (accepts any PIN for now)
10. **Edit Family Members screen** — list of 3 fake members with edit/delete buttons

**Fake data to use:**
- Family: Dad (👨), Mom (👩), Emma (👧), Lucas (👦)
- Chores: Sweep kitchen, Take out trash, Feed the dog, Make bed, Set the table, Water plants
- Meals: Pasta, Tacos, Grilled chicken, Caesar salad, Pancakes
- Events: Soccer practice, Piano lesson, Family movie night, Grocery shopping
- Fun Ideas: Beach day, Board game night, Bike ride, Bake cookies, Visit the zoo

**Done when:** You can click through every page, see all the cards and forms, switch themes, and it all looks polished. Nothing saves or loads from a database yet.

---

### Step 2: Connect to the Database (Real Data)

Hook up Supabase so everything actually saves and loads.

**What to build:**
1. Supabase client setup (connect to the existing database)
2. API routes for every feature:
   - Family members: list, add, edit, delete, upload photo
   - Chores: list, add, edit, delete, mark complete (+ award points)
   - Meals: saved meals, weekly plan, freezer inventory, favorites
   - Schedule: events list, add, edit, delete
   - Fun Ideas: list, add, edit, delete, favorite, schedule
   - Settings: load and save app title, theme, email preference
   - Parent auth: verify PIN, change PIN (stored securely, not hardcoded)
3. Replace all fake data with real data from the database
4. Add loading spinners while data loads
5. Add error messages when something goes wrong
6. Confetti celebration when completing a chore

**Done when:** You can add a real family member, create a real chore, mark it done, see points go up, plan real meals, and everything is still there when you refresh the page.

---

### Step 3: Polish, Test, and Launch

Make it solid and put it online.

**What to build:**
1. **Tests** — Automated checks that the important stuff works (PIN login, completing chores, saving meals)
2. **Accessibility** — Make sure it works with keyboard navigation, screen readers, and has good color contrast
3. **Performance** — Lazy-load pages so the app starts fast
4. **CI/CD pipeline** — Automatic checks that run every time code changes (catches bugs early)
5. **Deploy to Vercel** — Put it on the internet with a real URL the family can use
6. **Directives** — Write instruction documents for each feature (how it works, what the rules are, edge cases)
7. **Python utility scripts** — Backup data, reset weekly chores, generate progress reports

**Done when:** The app is live on the internet, tests pass, the family can use it on their phones, and there are written instructions for how everything works.
