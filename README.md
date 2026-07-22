# EchoOS

> **Your memories. Your taste. Your AI.**

EchoOS is a personal **Memory Operating System** — a private AI thinking partner that learns from *your* life (movies, food, travel, notes, wishlist) instead of the internet. It remembers, analyzes, predicts, recommends, explains, and summarizes using **only your own experiences**.

This is not a chatbot. It is a memory intelligence engine.

---

## Features

- **TMDB Movie Search & Logging** — Search any movie on TMDB, quick-add with metadata, rate and review
- **Food Journal** — Log restaurants and meals with ratings, cuisines, prices, and moods
- **Travel Log** — Track destinations, budgets, companions, durations, and favorite moments
- **Notes** — Capture ideas, journal entries, and fleeting thoughts with mood tracking
- **Wishlist** — Track movies, places, food, books, and products you want to experience
- **AI Chat** — Streaming conversational AI that answers from your own memories with reasoning, confidence scores, and suggestion chips
- **Timeline** — A unified chronological feed across all memory categories with filters and search
- **Dashboard** — Living portrait of your memories with AI-generated insights, KPIs, and activity charts
- **Analytics** — Charts and trends including genre preferences, mood distribution, cuisine affinities, and monthly activity
- **Search** — Full-text search across all memories with category, mood, rating, and date-range filters
- **Reminders** — In-app notification reminders with daily/weekly/monthly recurring options
- **PWA Support** — Installable as a standalone app with offline TMDB image caching
- **Guest Mode** — Try the app instantly, upgrade to Google account later to preserve data

---

## Tech Stack (100% free-tier)

- **Frontend:** React 18 · Vite · TypeScript · Tailwind CSS · Framer Motion
- **Routing/State:** React Router v6 (lazy routes) · TanStack Query · Zustand
- **Backend:** Firebase Auth · Firestore · Storage · Hosting (Spark plan)
- **AI proxy:** Vercel Serverless Functions (keeps Groq/TMDB keys server-side)
- **LLM:** Groq — `llama-3.3-70b-versatile` (reasoning) + `llama-3.1-8b-instant` (summaries)
- **PWA:** `vite-plugin-pwa` with Workbox runtime caching for TMDB images
- **Testing:** Vitest + React Testing Library (85+ tests)

---

## GitHub Setup

### Step 1: Create your first commit

```bash
# From the project root (F:/Territory/EchoOS)
git add --all
git commit -m "Initial commit: EchoOS — Your memories. Your taste. Your AI."
```

### Step 2: Create a GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `echoos` (or anything you prefer)
3. Keep it **Public** or **Private** — both work with Vercel
4. **Do NOT** initialize with README, .gitignore, or license (they already exist in the project)
5. Click **Create repository**

### Step 3: Push to GitHub

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/echoos.git
git branch -M master
git push -u origin master
```

### Step 4: Verify CI runs

Once pushed, go to your repo on GitHub and click the **Actions** tab. You should see the CI workflow running:
- `npm ci` → `npm run typecheck` → `npm test`

All 85 tests must pass and TypeScript must compile before the green checkmark appears.

---

## Vercel Deployment

EchoOS is designed to deploy on **Vercel** with the frontend hosted on **Firebase Hosting** or entirely on Vercel. The API proxy (Groq + TMDB) always runs on Vercel Serverless Functions to keep secret keys server-side.

### Architecture

Firebase's Spark plan has **no Cloud Functions**, and a pure client app would expose the Groq/TMDB secret keys in the browser bundle. The Vercel serverless functions verify the caller's Firebase ID token, inject the secret key server-side, and forward to the upstream API.

```
Browser (Firebase Hosting or Vercel)
   │  ── Firebase ID token ─▶  Vercel /api/chat ─▶ Groq
   │                           Vercel /api/tmdb ─▶ TMDB
   └── Firestore / Auth / Storage (direct, secured by rules)
```

### Step 1: Prepare your accounts

| Account | Purpose | How to get |
|---|---|---|
| [Vercel](https://vercel.com) | Hosting + serverless functions | Free Hobby plan |
| [Firebase](https://console.firebase.google.com) | Auth + Firestore + Storage | Spark (free) plan |
| [Groq](https://console.groq.com) | LLM API for AI chat | Free tier (rate-limited) |
| [TMDB](https://www.themoviedb.org/settings/api) | Movie metadata | Free API key |

### Step 2: Set environment variables in Vercel

In the Vercel dashboard, go to your project → **Settings → Environment Variables** and add:

**Client-side (VITE_ prefix — bundled into the browser):**
| Variable | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | Your Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Console |
| `VITE_FIREBASE_APP_ID` | From Firebase Console |
| `VITE_API_BASE_URL` | Your Vercel domain (`https://your-project.vercel.app`).<br>⚠️ You won't know this until after the first deploy — leave it blank initially, then add it and redeploy. |

**Server-side (secret — never leave Vercel):**
| Variable | Value |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `TMDB_API_KEY` | Your TMDB API key (v3 auth) |
| `FIREBASE_PROJECT_ID` | Same Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key (with real \\n) |

> **Firebase Admin credentials:** Go to Firebase Console → Project Settings → Service Accounts → "Generate new private key". The JSON file contains `project_id`, `client_email`, and `private_key`.

### Step 3: Deploy

#### Option A — Deploy via Git (recommended)

1. Push your repo to GitHub/GitLab/Bitbucket
2. In Vercel dashboard, click **Add New → Project**
3. Import your repo
4. Vercel auto-detects Vite — no changes needed:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add the environment variables from Step 2
6. Click **Deploy**

#### Option B — Deploy via CLI
```bash
npm i -g vercel
vercel login
vercel                          # Link and deploy
vercel --prod                   # Deploy to production
vercel env add GROQ_API_KEY     # Add each env var
vercel env add TMDB_API_KEY
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
vercel env add VITE_FIREBASE_API_KEY
# ... add all VITE_* vars too
vercel --prod                   # Re-deploy with env vars
```

### Step 4: Update Firebase Authentication authorized domains

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Vercel domain (e.g., `your-project.vercel.app`)
3. If using a custom domain, add that too

### Step 5: Verify

- Visit your Vercel URL — the app should load
- Sign in with Google or Guest mode
- Search for a movie → it should return results from TMDB
- Open the AI Chat → send a message → it should stream a response

### Local development with the Vercel proxy

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your Vercel project (pulls env vars locally)
vercel link

# Pull environment variables
vercel env pull .env.local

# Start both Vite + API proxy
vercel dev         # Vite on :5173, API on :3000
```

Alternatively, for **offline TMDB dev** without the proxy:
```bash
# In .env.local, set:
VITE_TMDB_DEV_KEY=your_tmdb_key_here
```
This bypasses the Vercel proxy and calls TMDB directly from the browser.

### Files deployed to Vercel

| File | Purpose |
|---|---|
| `api/chat.ts` | Groq streaming chat proxy |
| `api/tmdb.ts` | TMDB search/details proxy |
| `api/_lib/firebase.ts` | Firebase Admin SDK singleton |
| `api/package.json` | API function dependencies |
| `vercel.json` | Deployment configuration |
| `.vercelignore` | Files excluded from deployment |

---

## CI/CD

### GitHub Actions

Runs on every push/PR to `master`:
- `npm ci` → `npm run typecheck` → `npm test`

### Vercel Deployments

Every push to `master` auto-deploys to Vercel (if connected via Git).
Preview deployments are created automatically for PR branches.

## Project Structure

```
echoos/
├─ api/                          Vercel serverless proxy
│  ├─ chat.ts                    Groq streaming chat proxy
│  ├─ tmdb.ts                    TMDB search/details proxy
│  ├─ _lib/firebase.ts           Firebase Admin SDK singleton
│  └─ package.json               API function dependencies
├─ public/
│  ├─ favicon.svg                App favicon
│  ├─ icon-192.svg               PWA icon (SVG)
│  └─ icon-512.svg               PWA icon (SVG)
├─ src/
│  ├─ components/
│  │  ├─ chat/                   ChatInput, ChatMessage
│  │  ├─ food/                   FoodCard, FoodFormModal
│  │  ├─ layout/                 AppLayout, Sidebar, Topbar, MobileNav, ProtectedRoute, Logo
│  │  ├─ movies/                 MovieSearchBar (TMDB), MovieEditModal
│  │  ├─ notes/                  NoteCard, NoteFormModal
│  │  ├─ timeline/               TimelineItem
│  │  ├─ travel/                 TravelCard, TravelFormModal
│  │  ├─ ui/                     GlassCard, PageHeader, EmptyState, ErrorBoundary,
│  │  │                          LoadingScreen, NotificationBell, PwaStatus,
│  │  │                          ThemeToggle, StarRating, icons
│  │  └─ wishlist/               WishlistCard, WishlistFormModal
│  ├─ config/                    constants (routes, moods, models), env (typed env vars)
│  ├─ firebase/                  config (app init), auth (Google + anonymous sign-in)
│  ├─ hooks/
│  │  ├─ useAuth.tsx             Auth context provider
│  │  ├─ useAnalytics.ts         Cross-category analytics computation
│  │  ├─ useSearch.ts            Client-side full-text search with filters
│  │  ├─ useMovies/Food/Travel/  Per-collection TanStack Query hooks
│  │  │  Notes/Wishlist.ts
│  │  ├─ useTimeline.ts          Unified chronological feed from 5 collections
│  │  ├─ useNotifications.ts     Notification query + mutation hooks
│  │  ├─ usePreferences.ts       Theme, AI persona, reminders (Firestore + localStorage)
│  │  └─ useReminders.ts         Reminder CRUD + polling checker hook
│  ├─ pages/                     Dashboard, Chat, Timeline, Movies, Food, Travel, Notes,
│  │                              Wishlist, Search, Analytics, Settings, Login, NotFound
│  ├─ services/
│  │  ├─ firestore/              CRUD services: movies, food, notes, travel, wishlist,
│  │  │                          chats, notifications, reminders
│  │  ├─ groq/client.ts          Memory context builder + streaming chat client
│  │  ├─ tmdb/                   TMDB client (direct + proxy), image URLs, types
│  │  ├─ queryClient.ts          TanStack Query client config
│  │  └─ uiStore.ts              Zustand store for ephemeral UI state
│  ├─ styles/index.css           Tailwind + glass design system
│  ├─ types/index.ts             Domain models (MovieEntry, FoodEntry, etc.)
│  └─ utils/                     dates.ts, cache.ts (TTL localStorage)
├─ firestore.rules               Privacy-by-design security rules
├─ firestore.indexes.json        Composite indexes
├─ storage.rules                 Per-user image storage rules
├─ firebase.json                 Hosting + Firestore + Storage config
├─ vercel.json                   Vercel deployment config
├─ tailwind.config.js            Custom theme (color palette, glass shadows, animations)
├─ vitest.config.ts              Test configuration (jsdom, setup file)
└─ .github/workflows/ci.yml      CI pipeline (typecheck + test on push/PR)
```

---

## Data Model (Firestore)

Everything lives under `users/{uid}/…` so no query can cross users:

```
users/{uid}                     profile document
  ├─ movies/{id}                tmdbId, title, genres[], rating, mood, review…
  ├─ food/{id}                  restaurant, cuisine, price, dishes[], mood…
  ├─ travel/{id}                destination, budget, places[], companions[]…
  ├─ notes/{id}                 text, type (idea|journal|thought), mood…
  ├─ wishlist/{id}              category (movie|place|food|book|product), title, done
  ├─ chats/current/messages/{id}  role, content, reasoning, confidence, suggestionChips[]
  ├─ notifications/{id}         type (reminder|milestone|system), title, message, read
  └─ reminders/{id}             title, message, dueDate, interval, enabled
```

Each entry reserves an `embedding?: number[]` field for a future semantic-search upgrade — no migration needed.

---

## Security

- All data is scoped to `users/{uid}`; rules deny any cross-user access by default.
- Secret API keys (Groq, TMDB) never reach the browser — only the Vercel proxy holds them.
- Per-document field validation (rating bounds, size caps) in Security Rules.
- Storage limited to user's own prefix, images only, 5 MB cap.

---

## PWA

EchoOS is a fully installable Progressive Web App:
- Service worker with Workbox for precaching and runtime caching
- TMDB images cached with a `CacheFirst` strategy (50 entries, 7-day expiry)
- Configuration for `display: standalone` with maskable icons
- `beforeinstallprompt` listener surfaces install button in Settings

---

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run typecheck     # TypeScript check
```

The test suite covers:
- **Date utilities** (37 tests) — conversion, formatting, range display, relative time
- **Cache utilities** (9 tests) — TTL expiry, edge cases, error handling
- **Analytics hook** (26 tests) — aggregation, averages, monthly activity, complex scenarios
- **Search hook** (13 tests) — text/category/mood/rating filtering, debounce, clear

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_API_BASE_URL` | No | Vercel proxy URL (default: `http://localhost:3000`) |
| `VITE_TMDB_DEV_KEY` | No* | TMDB key for local dev (bypass proxy) |

\* `VITE_TMDB_DEV_KEY` is optional — set it to bypass the Vercel proxy during local development. Leave blank in production.

**Server-side secrets (set in Vercel dashboard):**

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key for AI chat |
| `TMDB_API_KEY` | TMDB API key for movie search |
| `FIREBASE_PROJECT_ID` | Firebase Admin project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin client email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key |

---

## CI/CD

### GitHub Actions

Runs on every push/PR to `master`:
- `npm ci` → `npm run typecheck` → `npm test`

### Vercel Deployments

Every push to `master` auto-deploys to Vercel (if connected via Git).
Preview deployments are created automatically for PR branches.

---

## License

Prototype built for an AI Innovation Training program.
