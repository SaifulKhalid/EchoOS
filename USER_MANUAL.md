# EchoOS User Manual

> **Your memories. Your taste. Your AI.**

EchoOS is a personal Memory Operating System — a private AI thinking partner that learns from **your life** instead of the internet. It remembers, analyzes, and helps you explore your own experiences: movies you've watched, meals you've enjoyed, places you've traveled, thoughts you've captured, and things you want to do.

This manual covers everything you need to use EchoOS effectively.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Navigation](#2-navigation)
3. [Dashboard](#3-dashboard)
4. [Movies](#4-movies)
5. [Food](#5-food)
6. [Travel](#6-travel)
7. [Notes](#7-notes)
8. [Wishlist](#8-wishlist)
9. [AI Chat](#9-ai-chat)
10. [Timeline](#10-timeline)
11. [Analytics](#11-analytics)
12. [Search](#12-search)
13. [Settings & Account](#13-settings--account)
14. [Privacy & Security](#14-privacy--security)
15. [Tips & Best Practices](#15-tips--best-practices)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Getting Started

### Signing In

You have two ways to use EchoOS:

**Continue with Google** (recommended)
- Your data is permanently saved to your Google account
- Access your memories from any device
- Click "Continue with Google" on the login screen and authorize the app

**Guest mode**
- Start instantly without signing up — no email or password needed
- Your data is tied to an anonymous account on your current device
- Click "Try in Guest mode" on the login screen
- ⚠️ **Important:** Guest data can be lost. If you clear your browser data or sign out without linking a Google account, all your entries will be permanently deleted.

### Upgrading from Guest to Google

If you started as a guest and want to save your data permanently:

1. Go to **Settings**
2. In the **Account** section, click **"Save my data — link Google"**
3. Authorize with Google — your existing entries will be preserved under the same account

### Installing as an App (PWA)

EchoOS is a Progressive Web App — you can install it on your phone or desktop for a native-like experience:

1. Go to **Settings** → **App** section
2. Click **"Install EchoOS"**
3. Alternatively, use your browser's install button (usually in the address bar or menu)

Installed features:
- Works offline (previously viewed data is cached)
- Launches from your home screen without a browser chrome
- Faster loading

---

## 2. Navigation

### Desktop Navigation (≥768px)

The sidebar on the left shows all available sections organized into groups:

| Group | Sections |
|---|---|
| **Primary** | Dashboard, AI Chat, Timeline |
| **Library** | Movies, Food, Travel, Notes, Wishlist |
| **Insights** | Search, Analytics, Settings |

The sidebar also shows the EchoOS logo at the top. Active sections are highlighted with a sliding indicator.

### Mobile Navigation (<768px)

A bottom navigation bar appears with the 5 most-used sections:
- **Home** — Dashboard
- **Timeline** — All memories in chronological order
- **Chat** — AI Chat
- **Library** — Movies
- **Insights** — Analytics

To access the remaining sections (Food, Travel, Notes, Wishlist, Search, Settings):

1. Tap the **More** button (three dots) on the far right of the bottom nav
2. A bottom sheet slides up showing all remaining sections
3. Tap any section to navigate — the sheet closes automatically

### Top Bar

The top bar shows:
- A welcome greeting with your name
- A **notification bell** (shows unread count) — click to view notifications
- Your **avatar** or initial — click to access the account menu with a **Sign out** button

---

## 3. Dashboard

The Dashboard is your home base — a living portrait of your memories and taste.

### What you'll see

- **AI Insight** — Computed observations about your patterns (e.g., "Your top movie genre is Action", "You feel joyful most often when logging memories")
- **KPI Cards** — Quick counts of Movies, Meals, Trips, and Notes with average ratings
- **Recent Memories** — The 6 most recent entries across all categories
- **Monthly Activity** — Bar chart showing how many memories you logged each month this year
- **Top Genres** — Your most-watched movie genres (when you have movie entries)
- **Quick Glance** — Stats like total entries, average ratings, budget totals, and top mood

### Starting out

New users will see empty states and the message "Start logging memories and EchoOS will surface patterns here." — head to Movies, Food, Travel, Notes, or Wishlist to add your first entries.

---

## 4. Movies

Find, log, and review movies you've watched.

### Adding a Movie

1. Use the **Movie Search Bar** at the top of the Movies page
2. Type a movie title — results appear from TMDB with poster art, year, and genres
3. Click **"Log"** on any result to add it instantly with an optional rating
4. The movie appears in your grid

### Editing a Movie

Click any movie poster in your grid to open the Edit modal where you can adjust:

| Field | Description |
|---|---|
| **Rating** | Rate 0–10 using the star rating (each star = 2 points) |
| **Mood** | How the movie made you feel (Joyful, Calm, Loved, Melancholy, Awed, Neutral) |
| **Review** | Write your thoughts about the movie |
| **Favorite** | Toggle to mark as a favorite |
| **Rewatch** | Mark if you've watched it multiple times |
| **Tags** | Comma-separated keywords (e.g., "must-watch, sci-fi, classic") |

### Deleting a Movie

1. Open the movie's edit modal (click the poster)
2. Click **"Delete"** in the bottom-left
3. Confirm the deletion — the movie is permanently removed

### Sorting & Filtering

Use the toolbar above the grid to:

- **Sort by**: Recent (watch date), Rating (highest first), or Title (alphabetical)
- **Filter**: Toggle "Favorites only" to show only favorited movies
- The count at the right shows how many movies match your current view

---

## 5. Food

Log restaurants, cafés, and dishes worth remembering.

### Adding a Meal

1. Click **"Add Meal"** button at the top of the Food page
2. Fill in the form:

| Field | Required | Description |
|---|---|---|
| **Restaurant** | ✅ | Name of the restaurant or café |
| **Cuisine** | ❌ | Type of cuisine (e.g., Italian, Japanese) |
| **Price ($)** | ❌ | How much you spent |
| **Rating** | ❌ | Your rating 0–10 |
| **Favorite Dishes** | ❌ | Comma-separated list of dishes you loved |
| **Mood** | ❌ | How you felt during the meal |
| **Notes** | ❌ | Any additional thoughts |
| **Date** | ❌ | When you visited (defaults to today) |
| **Favorite** | ❌ | Toggle to mark as a favorite restaurant |

3. Click **"Log Meal"** to save

### Editing a Meal

Click any food card to open the edit modal and modify any field. Click **"Save"** when done.

### Deleting a Meal

1. Open the meal's edit modal (click the card)
2. Click **"Delete"** in the bottom-left
3. Confirm the deletion

### Sorting & Filtering

- **Sort by**: Recent (date), Rating (highest), Price (lowest), or Name (alphabetical)
- **Filter**: Toggle "Favorites only"

---

## 6. Travel

Track destinations, budgets, companions, and favorite moments from your trips.

### Adding a Trip

1. Click **"Add Trip"** at the top of the Travel page
2. Fill in the form:

| Field | Required | Description |
|---|---|---|
| **Destination** | ✅ | Where you went (e.g., "Kyoto, Japan") |
| **Start Date** | ❌ | When the trip started |
| **End Date** | ❌ | When the trip ended (duration auto-calculates) |
| **Budget ($)** | ❌ | Total trip budget |
| **Rating** | ❌ | Your rating 0–10 |
| **Companions** | ❌ | Who you traveled with (comma-separated) |
| **Places Visited** | ❌ | Specific locations (comma-separated) |
| **Favorite Moments** | ❌ | Highlights of the trip (comma-separated) |
| **Mood** | ❌ | Overall feeling about the trip |
| **Notes** | ❌ | Any additional details |
| **Favorite** | ❌ | Mark as a favorite trip |

3. Click **"Log Trip"** to save

### Duration Auto-calculation

When you set both a Start Date and End Date, EchoOS automatically calculates and displays the trip duration in days.

### Editing & Deleting

Same pattern as other sections — click a card to edit, use **"Delete"** in the edit modal with confirmation.

---

## 7. Notes

Capture ideas, journal entries, and fleeting thoughts.

### Adding a Note

1. Click **"New Note"** at the top of the Notes page
2. Choose a **type**:

| Type | Best for |
|---|---|
| **Idea** | A spark worth keeping — creative concepts, project ideas |
| **Journal** | A moment in your day — personal reflections, daily logs |
| **Thought** | Something on your mind — random musings, observations |

3. Add an optional **title**
4. Write your note content (required)
5. Set a **date** and **mood** if desired
6. Click **"Save Note"**

### Filtering & Sorting

- **Filter by type**: All, Ideas, Journals, or Thoughts
- **Sort by**: Recent or Title

### Editing & Deleting

Same pattern — click a card to edit, delete with confirmation.

---

## 8. Wishlist

Track movies, places, foods, books, and products you want to experience.

### Adding an Item

1. Click **"Add Item"** at the top of the Wishlist page
2. Choose a **category**:

| Category | Examples |
|---|---|
| 🎬 **Movie** | Films you want to watch |
| 📍 **Place** | Destinations to visit |
| 🍽️ **Food** | Restaurants or dishes to try |
| 📚 **Book** | Books to read |
| 🛍️ **Product** | Things to buy |

3. Add a **title** (required) and optional **note**
4. Toggle **"Mark as completed"** if you've already done it
5. Set a **mood** if desired
6. Click **"Add Item"**

### Features

- **Show done** toggle — show or hide completed items
- **Category filter** — view only Movies, Places, etc.
- **Sort by**: Title or Category

### Editing & Deleting

Same pattern — click a card to edit, delete with confirmation.

---

## 9. AI Chat

Talk to an AI that knows only about **your** memories — not the internet.

### How it works

EchoOS reads your latest entries from Movies, Food, Travel, Notes, and Wishlist and feeds them to an AI model (Groq's Llama 3.3 70B). The AI is instructed to answer **only from your own data** — it won't make up facts or pull information from the web.

### Getting Started

Open the Chat page and you'll see welcome suggestions you can click:

- "What movies did I watch this year?"
- "Which restaurants have I rated highest?"
- "Summarize my travel this year"
- "What genres do I watch most?"

### Sending a Message

Type your question in the input box at the bottom and press **Enter** (or click the sparkle button). Use **Shift+Enter** for a new line without sending.

### Understanding the Response

Each AI response can include:

- **Main answer** — The AI's response to your question, streamed live as it's generated
- **Reasoning** (expandable) — A brief explanation of how the AI arrived at its answer (click "Reasoning" to expand)
- **Self-assessment** — A rough confidence indicator (not a calibrated score — it's the AI's own estimate)
- **Suggestion chips** — Follow-up questions you can click to continue the conversation

### Privacy Disclosure

Messages you send are processed by Groq's third-party API. Avoid sharing sensitive personal information in chat. Your stored memories (movies, food, etc.) are included as context for the AI.

### AI Persona

In Settings, you can change how the AI talks to you:

| Persona | Style |
|---|---|
| **Default** | Warm, insightful, conversational — like a close friend |
| **Witty** | Quick with humor and clever observations |
| **Analytical** | Data-driven, precise, and structured |
| **Enthusiastic** | Energetic and excited about your memories |
| **Minimalist** | Short, direct, and efficient |

---

## 10. Timeline

A unified chronological feed of every memory across all categories.

### Viewing Your Timeline

The Timeline page shows all your entries grouped by **year** and **month**, most recent first. Each entry displays its category, title, date, rating, mood, and a preview.

### Filtering

Use the filter toolbar to narrow down:

- **Category filter** — All, Movie, Food, Travel, Note, or Wishlist
- **Mood filter** — Filter by how you felt (Joyful, Calm, Loved, etc.)
- **Search** — Type to search titles, subtitles, and previews

### Navigation

The filter shows the total count of matching entries and how many were filtered from the full list.

---

## 11. Analytics

Charts and trends drawn entirely from your own memories.

### What you'll see

| Section | Description |
|---|---|
| **KPI Cards** | Counts of Movies, Meals, Trips, Notes, Wishlist items, Total Budget, and Days Traveled |
| **Average Ratings** | Bar chart comparing your average ratings across Movies, Food, and Travel |
| **Top Movie Genres** | Most-watched genres ranked by count |
| **Mood Distribution** | How your moods break down across all entries |
| **Cuisine Preferences** | Most-logged cuisine types |
| **Movie Languages** | Languages of movies you've watched |
| **Monthly Activity** | Bar chart of entries per month this year |
| **Quick Stats** | Additional stats like average meal price, average trip duration, wishlist progress |

All charts are animated and computed client-side from your cached data — no extra server calls.

---

## 12. Search

Full-text search across all your memories with powerful filters.

### How to Search

1. Type a query in the search bar (searches titles, notes, reviews, destinations)
2. Use the filter pills to narrow results:

| Filter | What it does |
|---|---|
| **Category** | Movies, Food, Travel, Notes, or Wishlist |
| **Mood** | Filter by how you felt |
| **Rating** | Minimum rating (Any, 7+, 5+, 3+) |
| **Date range** | From and To date pickers |

3. Results show with category badges, match snippets (highlighted in italic), and metadata

### Tips

- The search is client-side and instant — zero extra Firestore reads
- Click **"Clear all filters"** to reset everything at once
- Search works even offline if the data has been loaded before

---

## 13. Settings & Account

Manage your account, preferences, and data.

### Account

| Feature | Description |
|---|---|
| **Profile** | Your display name, email, and avatar |
| **Guest upgrade** | Link a Google account to preserve guest data |
| **Sign out** | Sign out of your session (⚠️ guests: this will lose your data unless linked) |

### Appearance

Toggle between **Dark** and **Light** mode. Your preference syncs across devices.

### AI Persona

Choose how the AI talks to you in the Chat (see [AI Chat section](#9-ai-chat) for persona details).

### Reminders

Set in-app notifications to prompt you about memories:

1. Toggle **Reminders** on
2. Click **"New reminder"**
3. Set a title, optional message, date, and interval (Once, Daily, Weekly, Monthly)
4. Active reminders appear in the list — you can delete them with the trash icon

Note: Reminders only fire while the EchoOS tab is open. They cannot notify you when the app is closed (push notifications are not yet implemented).

### App (PWA)

Install EchoOS as a standalone app (see [Getting Started](#1-getting-started) for details). Shows the current app version.

### Data

| Action | What it does |
|---|---|
| **Clear local cache** | Clears cached data and reloads the app |
| **Export all data (JSON)** | Downloads all your memories as a JSON file for backup or transfer |

### Danger Zone: Account Deletion

**This is permanent and cannot be undone.**

1. Click **"Delete my account and all data"**
2. Confirm the first warning dialog
3. Confirm the final warning dialog

All your memories, preferences, chat history, and account information will be permanently deleted from Firebase. You will be signed out immediately.

---

## 14. Privacy & Security

### Data Ownership

- **Your data belongs to you.** All memories you log are stored in your own Firebase project under your user ID.
- **No cross-user access.** Firebase Security Rules deny any attempt to read or write another user's data.
- **API keys stay server-side.** Your Groq and TMDB API keys never reach the browser — they live only in Vercel serverless functions.

### Third-Party Processing

- **AI Chat uses Groq's API.** When you send a message in the AI Chat, your question and your memory context are sent to Groq's servers for processing. This is disclosed in the Chat interface.
- **Movie search uses TMDB API.** Searching for movies sends your query to The Movie Database (TMDB).
- **Authentication uses Google.** If you sign in with Google, Google handles the authentication — EchoOS only receives your name, email, and profile picture.

### Data Export & Deletion

- **Export** your data anytime from Settings → Data → "Export all data (JSON)"
- **Delete** your entire account from Settings → Danger Zone

---

## 15. Tips & Best Practices

### Getting the Most Out of EchoOS

1. **Log consistently** — The more entries you add, the better the AI Chat and Analytics become. Even a quick rating without a review adds value.

2. **Use moods** — Tagging entries with moods helps the Dashboard and Analytics show meaningful patterns about how different experiences make you feel.

3. **Rate on a 10-point scale** — The star rating uses a 0–10 scale (each star = 2 points). A half-filled star = 1 point. Be consistent with your ratings for meaningful averages.

4. **Use tags on movies** — Tags like "must-watch", "sci-fi", "rewatch" help you find movies later and give the AI more context.

5. **Ask the AI specific questions** — The AI works best with specific questions like "What's the highest rated Italian restaurant I've been to?" rather than vague ones like "Tell me about food."

6. **Save your data** — If you started as a guest, link a Google account in Settings to prevent data loss.

7. **Export regularly** — Download your JSON backup from Settings to keep a personal copy of all your memories.

### Quick Reference

| Task | How to |
|---|---|
| Add a movie | Movies page → Search → "Log" |
| Log a meal | Food page → "Add Meal" → fill form |
| Record a trip | Travel page → "Add Trip" → fill form |
| Write a note | Notes page → "New Note" → choose type |
| Add to wishlist | Wishlist page → "Add Item" → choose category |
| Chat with AI | Chat page → type question |
| View all memories | Timeline page → filter as needed |
| See trends | Analytics page |
| Change theme | Settings → Appearance |
| Export data | Settings → Data → "Export all data" |
| Delete account | Settings → Danger Zone |

---

## 16. Troubleshooting

### "Firebase isn't configured yet"

This appears when the app hasn't been connected to Firebase yet. If you're the developer, see the [README.md](README.md) for setup instructions.

### AI Chat shows an error

- Make sure you have entries logged — the AI can only answer from your data
- Check your internet connection
- The AI may be rate-limited — wait a minute and try again

### Movie search returns nothing

- Check your internet connection
- Ensure TMDB is configured correctly (developer: check `TMDB_API_KEY` environment variable)

### Can't find a section on mobile

Tap the **More** button (three dots) on the bottom navigation bar to open the full menu.

### Data not appearing after sign-in

- If you upgraded from guest to Google, make sure you're signed in with the same Google account
- Try refreshing the page

### Notifications aren't appearing

- Ensure **Reminders** are enabled in Settings
- The EchoOS tab must be open — push notifications are not yet supported

---

*EchoOS v0.1.0 — Built for an AI Innovation Training program.*
