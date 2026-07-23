# EchoOS — Architecture & Algorithms

> **Purpose:** This document explains how EchoOS works internally — its architecture, data flow, key algorithms, and design decisions. Written for developers and AI models to quickly understand the codebase.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Stack & Justification](#3-stack--justification)
4. [Data Model](#4-data-model)
5. [Data Flow](#5-data-flow)
6. [Key Algorithms](#6-key-algorithms)
7. [Component Architecture](#7-component-architecture)
8. [State Management](#8-state-management)
9. [Security Model](#9-security-model)
10. [API Design](#10-api-design)
11. [AI Chat Pipeline](#11-ai-chat-pipeline)
12. [Testing Strategy](#12-testing-strategy)
13. [Performance Considerations](#13-performance-considerations)
14. [Known Limitations](#14-known-limitations)
15. [Future Architecture Considerations](#15-future-architecture-considerations)

---

## 1. System Overview

EchoOS is a **single-page application** (SPA) with an **API proxy layer** — no traditional backend. The frontend (React) talks directly to Firebase for auth and data, while a thin Vercel serverless layer proxies requests to external APIs (Groq, TMDB) to keep secret keys server-side.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (SPA)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐ │
│  │  React    │ │  TanStack│ │  Zustand │ │  Firebase SDK     │ │
│  │  Router   │ │  Query   │ │  (UI)    │ │  (Auth + Firestore)│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┬──────────┘ │
│                                                   │            │
└───────────────────────────────────────────────────┼────────────┘
                                                    │
                    ┌───────────────────────────────┼────────────┐
                    │              Vercel           │            │
                    │  ┌────────────────────────────┴────────┐   │
                    │  │  Serverless Functions               │   │
                    │  │  ┌──────────┐  ┌──────────┐        │   │
                    │  │  │ /api/chat│  │/api/tmdb │        │   │
                    │  │  └────┬─────┘  └────┬─────┘        │   │
                    │  └───────┼──────────────┼──────────────┘   │
                    └──────────┼──────────────┼──────────────────┘
                               │              │
                    ┌──────────┴──────┐ ┌─────┴──────────┐
                    │  Groq API       │ │  TMDB API      │
                    │  (LLM)          │ │  (Movie Data)  │
                    └─────────────────┘ └────────────────┘

                    ┌──────────────────────────────────────┐
                    │  Firebase                             │
                    │  ┌──────────┐  ┌───────────────────┐ │
                    │  │ Auth     │  │ Firestore         │ │
                    │  │ (Google  │  │ (users/{uid}/...) │ │
                    │  │  + Guest)│  │                   │ │
                    │  └──────────┘  └───────────────────┘ │
                    └──────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **No backend server** | Firebase handles auth, database, and file storage — no server to maintain |
| **Vercel proxy only for secrets** | Keeps Groq/TMDB API keys out of the browser bundle; every proxy call verifies Firebase ID token |
| **Firestore subcollections per user** | All data under `users/{uid}` — Firestore security rules enforce scoping, no cross-user leak possible |
| **Client-side analytics** | All aggregation, counting, and charting happens in the browser from cached query data — zero extra Firestore reads |
| **Zustand for UI state** | Lightweight (1.2 KB) alternative to Redux; only used for ephemeral state (modals, toasts, command palette) |
| **TanStack Query for server state** | Handles caching, refetching, pagination, and optimistic updates for all Firestore data |

---

## 2. Stack & Justification

| Layer | Technology | Version | Why |
|---|---|---|---|
| **UI Framework** | React | 18.3 | Industry standard, large ecosystem |
| **Build Tool** | Vite | 6.0 | Fast HMR, code splitting, PWA plugin |
| **Language** | TypeScript | 5.7 | Type safety across the entire codebase |
| **Styling** | Tailwind CSS | 3.4 | Utility-first, consistent design system |
| **Animation** | Framer Motion | 11.15 | Declarative animations, layout animations |
| **Routing** | React Router v6 | 6.28 | Nested routes, lazy loading |
| **Server State** | TanStack Query | 5.62 | Caching, refetching, optimistic updates |
| **UI State** | Zustand | 5.0 | Minimal boilerplate, no providers |
| **Database** | Firebase Firestore | 11.1 | Real-time, offline support, Spark free tier |
| **Auth** | Firebase Auth | 11.1 | Google + Anonymous, 10k free users/mo |
| **LLM** | Groq API | — | Llama 3.3 70B (fast, generous free tier) |
| **Movie Data** | TMDB API | — | Free, comprehensive movie metadata |
| **Hosting** | Vercel + Firebase | — | Vercel for proxy functions, Firebase for data |
| **PWA** | vite-plugin-pwa | 0.21 | Offline support, installable app |
| **Testing** | Vitest + RTL | 4.1/16.3 | Fast, Vite-native, component testing |

---

## 3. Data Model

### Firestore Schema

All user data lives under `users/{uid}` — a pattern that guarantees data isolation through Firestore security rules:

```
users/{uid}                          ← User profile document
│
├── movies/{id}                      ← Movie log entries
│   ├── tmdbId: number               ← TMDB identifier
│   ├── title: string                ← Movie title
│   ├── poster?: string              ← Poster image URL
│   ├── backdrop?: string            ← Backdrop image URL
│   ├── genres: string[]             ← Genre tags
│   ├── year?: number                ← Release year
│   ├── language?: string            ← Original language
│   ├── cast?: string[]              ← Actor names
│   ├── director?: string            ← Director name
│   ├── runtime?: number             ← Minutes
│   ├── overview?: string            ← TMDB synopsis
│   ├── rating?: number              ← User rating 0–10
│   ├── watchDate?: FireDate         ← When user watched it
│   ├── review?: string              ← User review text
│   ├── favorite?: boolean           ← Favorite flag
│   ├── rewatch?: boolean            ← Rewatched flag
│   ├── aiNotes?: string             ← Reserved: AI generated notes
│   ├── mood?: MoodId                ← Emotional tag
│   ├── tags?: string[]              ← User-defined keywords
│   ├── embedding?: number[]         ← Reserved: semantic search
│   └── createdAt/updatedAt: FireDate
│
├── food/{id}                        ← Food journal entries
│   ├── restaurant: string           ← Restaurant name
│   ├── cuisine?: string             ← Cuisine type
│   ├── price?: number               ← Amount spent
│   ├── rating?: number              ← User rating 0–10
│   ├── favoriteDishes?: string[]    ← Dishes ordered
│   ├── date?: FireDate             ← Visit date
│   ├── notes?: string               ← User notes
│   ├── favorite?: boolean           ← Favorite flag
│   ├── mood?: MoodId
│   ├── tags?: string[]
│   ├── embedding?: number[]
│   └── createdAt/updatedAt
│
├── travel/{id}                      ← Travel entries
│   ├── destination: string          ← Location
│   ├── startDate?: FireDate
│   ├── endDate?: FireDate
│   ├── durationDays?: number        ← Auto-calculated
│   ├── budget?: number
│   ├── rating?: number
│   ├── companions?: string[]
│   ├── places?: string[]
│   ├── favoriteMoments?: string[]
│   ├── notes?: string
│   ├── favorite?: boolean
│   ├── mood?: MoodId
│   ├── tags?: string[]
│   ├── embedding?: number[]
│   └── createdAt/updatedAt
│
├── notes/{id}                       ← Notes entries
│   ├── text: string                 ← Note content
│   ├── type: 'idea'|'journal'|'thought'
│   ├── title?: string
│   ├── date?: FireDate
│   ├── mood?: MoodId
│   ├── tags?: string[]
│   ├── embedding?: number[]
│   └── createdAt/updatedAt
│
├── wishlist/{id}                    ← Wishlist entries
│   ├── category: 'movie'|'place'|'food'|'book'|'product'
│   ├── title: string
│   ├── note?: string
│   ├── done?: boolean               ← Completed flag
│   ├── mood?: MoodId
│   ├── tags?: string[]
│   ├── embedding?: number[]
│   └── createdAt/updatedAt
│
├── chats/current/messages/{id}      ← Chat messages
│   ├── role: 'user'|'assistant'
│   ├── content: string
│   ├── reasoning?: string           ← AI's explanation
│   ├── confidence?: number          ← 0-1 self-assessment
│   ├── suggestionChips?: string[]
│   ├── referencedMemoryIds?: string[]
│   └── createdAt: FireDate
│
├── notifications/{id}              ← In-app notifications
│   ├── type: 'reminder'|'milestone'|'system'
│   ├── title: string
│   ├── message: string
│   ├── read: boolean
│   ├── linkedEntryId?: string
│   ├── linkedCategory?: MemoryCategory
│   ├── reminderId?: string
│   └── createdAt: FireDate
│
└── reminders/{id}                   ← Reminder configurations
    ├── title: string
    ├── message: string
    ├── dueDate: FireDate
    ├── interval: 'once'|'daily'|'weekly'|'monthly'
    ├── enabled: boolean
    ├── category?: MemoryCategory
    ├── lastTriggered?: FireDate
    └── createdAt: FireDate
```

### Reserved Fields

Every entry type includes an `embedding?: number[]` field. This is reserved for a future semantic-search upgrade — the field exists in the schema today so no data migration is needed when embeddings are enabled.

### Memory Categories

The five memory categories form the core of the app:
```typescript
const MEMORY_CATEGORIES = ['movie', 'food', 'travel', 'note', 'wishlist'] as const;
```

These are referenced throughout the codebase — the timeline, analytics, AI context builder, and search all iterate over this list.

### Mood System

Six moods are available for tagging:
```typescript
const MOODS = [
  { id: 'joy',     label: 'Joyful',     color: 'mood-joy'  },
  { id: 'calm',    label: 'Calm',       color: 'mood-calm' },
  { id: 'love',    label: 'Loved',      color: 'mood-love' },
  { id: 'sad',     label: 'Melancholy', color: 'mood-sad'  },
  { id: 'awe',     label: 'Awed',       color: 'mood-awe'  },
  { id: 'neutral', label: 'Neutral',    color: 'mood-neutral' },
] as const;
```

---

## 4. Data Flow

### Read Flow

```
User visits page
       │
       ▼
Page component mounts
       │
       ▼
TanStack Query hook fires (useMovies, useFood, etc.)
       │
       ▼
Query checks cache → if stale or missing → fetch from Firestore
       │
       ▼
Firestore returns documents → TanStack caches + notifies component
       │
       ▼
Component re-renders with data → loading skeletons disappear
       │
       ▼
(Optional) Analytics hook reads all 5 query caches → computes aggregates
```

Key points:
- Each category has its own TanStack Query hook (e.g., `useMovies()`, `useFood()`)
- The `useAnalytics()` hook reads from 5 separate queries and computes aggregates client-side
- The `useTimeline()` hook merges all 5 collections into a single sorted feed
- The `useSearch()` hook filters the timeline data — no separate Firestore queries
- Firestore's `persistentLocalCache` (IndexedDB) enables offline reads

### Write Flow

```
User fills form → clicks Save
       │
       ▼
Form modal calls useMutation().mutateAsync(data)
       │
       ▼
Mutation calls Firestore service (addDoc / updateDoc)
       │
       ▼
On success → invalidate related TanStack Query → UI updates instantly
       │
       ▼
Toast notification: "Saved!" / "Error: ..."
```

### Delete Flow

```
User clicks "Delete"
       │
       ▼
window.confirm("Delete X? This cannot be undone.")
       │
       ├── Cancel → do nothing
       │
       └── Confirm → call deleteMutation.mutateAsync(id)
                       │
                       ▼
                      Firestore deleteDoc()
                       │
                       ▼
                      Invalidate query → UI updates
                       │
                       ▼
                      Toast: "Deleted X"
                            OR
                      Toast: "Failed to delete" (on error)
```

---

## 5. Key Algorithms

### 5.1 Analytics Computation (`useAnalytics.ts`)

The analytics hook reads from all 5 TanStack Query caches and computes:

```typescript
function useAnalytics() {
  // Read all 5 caches in parallel
  const movies  = useMovies();    // MovieEntry[]
  const food    = useFood();      // FoodEntry[]
  const travel  = useTravel();    // TravelEntry[]
  const notes   = useNotes();     // NoteEntry[]
  const wishlist = useWishlist(); // WishlistEntry[]

  // Memoized computation (only re-runs when source data changes)
  return useMemo(() => ({
    // ── Counts per category
    counts: { movie: n, food: n, travel: n, note: n, wishlist: n },

    // ── Averages (filtered: only entries WITH ratings)
    avgMovieRating: sum(rating) / ratedCount,
    avgFoodRating:  sum(rating) / ratedCount,
    avgTravelRating: sum(rating) / ratedCount,

    // ── Top N genres sorted by frequency (limit 8)
    topGenres: [{ name: string, count: number }],

    // ── Mood distribution across all entries
    topMoods: [{ id: string, count: number }],

    // ── Monthly activity (this calendar year, 12 buckets)
    monthlyActivity: [{ month: 0..11, count: number }],

    // ── Cuisine frequency
    cuisineCounts: [{ name: string, count: number }],

    // ── Movie languages
    topLanguages: [{ name: string, count: number }],

    // ── Travel aggregates
    totalTripDays: sum(durationDays),
    totalBudget:   sum(budget),
    avgTripDuration: sum(durationDays) / tripCount,
    avgMealPrice: sum(price) / mealCount,

    // ── Wishlist progress
    wishlistTotal: entries.length,
    wishlistDone:  entries.filter(e => e.done).length,

    // ── Totals
    totalEntries: movieCount + foodCount + travelCount + noteCount,
    isLoading:    anyQuery.isLoading,
  }), [movies, food, travel, notes, wishlist]);
}
```

**Design notes:**
- All computation is client-side from cached data — zero extra Firestore reads
- The `useMemo` dependency array ensures recomputation only when data changes
- Missing ratings are excluded from averages (not treated as 0)
- Monthly activity uses 12 fixed buckets for the current year

### 5.2 Timeline Merging (`useTimeline.ts`)

Merges 5 Firestore collections into a single chronological feed:

```typescript
function useTimeline() {
  const movies   = useMovies();
  const food     = useFood();
  const travel   = useTravel();
  const notes    = useNotes();
  const wishlist = useWishlist();

  return useMemo(() => {
    // Map each category's entries to a unified TimelineEntry
    const entries: TimelineEntry[] = [
      ...movies.data.map(m => ({
        type: 'movie',
        title: m.title,
        date: m.watchDate ?? m.createdAt,
        rating: m.rating,
        mood: m.mood,
        // ... unified fields
      })),
      // ... same for food, travel, notes, wishlist
    ];

    // Sort by date descending
    entries.sort((a, b) => dateSortKey(b.date) - dateSortKey(a.date));

    return { entries, isLoading };
  }, [movies, food, travel, notes, wishlist]);
}
```

**Design notes:**
- Each entry type maps to a `TimelineEntry` interface with unified fields
- Sorting is by the entry's date field (watchDate, date, startDate, etc.)
- The timeline is the backbone for the Dashboard ("Recent Memories"), Timeline page, and Search

### 5.3 AI Chat Pipeline (`src/services/groq/client.ts` + `api/chat.ts`)

The most algorithmically complex part of the app. The pipeline has 4 stages:

#### Stage 1: Memory Context Building (client-side)

```typescript
async function fetchUserMemories(uid: string): Promise<MemoryBundle> {
  // Fetch the 50 most recent docs from each of 5 collections
  const [movies, food, travel, notes, wishlist] = await Promise.all([
    fetchAll<MovieEntry>('movies'),
    fetchAll<FoodEntry>('food'),
    fetchAll<TravelEntry>('travel'),
    fetchAll<NoteEntry>('notes'),
    fetchAll<WishlistEntry>('wishlist'),
  ]);
  return { movies, food, travel, notes, wishlist };
}

function buildContext(memories: MemoryBundle): string {
  // Flatten all entries into a plain-text summary
  // Format:
  // ## Movies Watched
  //   - Inception (2010) [Sci-Fi, Thriller] Rating: 8/10 "Mind-bending..."
  // ## Food Log
  //   - Joe's Italian (Italian) Rating: 9/10 Faves: Pasta Carbonara
  // ...
}
```

**Limit:** The 50 most recent docs per category are fetched — once a user has >50 entries in a category, older entries are invisible to the AI (but still visible everywhere else in the app). This is a known limitation.

#### Stage 2: System Prompt Construction

```typescript
function buildSystemPrompt(context: string, persona: AiPersona): string {
  return [
    'You are EchoOS, a personal AI assistant...',
    'Answer ONLY from the user\'s memories below. DO NOT make up facts.',
    PERSONA_INSTRUCTIONS[persona],  // Persona-specific tone instruction
    '',
    'At the very end, include a structured metadata block:',
    '<!--ECHOOS_META{"reasoning":"...","suggestionChips":["...","..."]}-->',
    '',
    'Here are the user\'s memories:',
    context,
    'Remember: only answer from the data above.',
  ].join('\n');
}
```

**Persona instructions** modify the AI's behavior:
```typescript
{
  default:       'Be warm, insightful, and conversational',
  witty:         'Be quick with humor and clever observations',
  analytical:    'Be data-driven, precise, and structured',
  enthusiastic:  'Be energetic and excited about their memories',
  minimalist:    'Be short, direct, and efficient',
}
```

#### Stage 3: Streaming Chat (client → Vercel → Groq)

```typescript
async function streamChat(messages, onDelta, onMetadata) {
  // 1. Get Firebase ID token
  const token = await auth.currentUser?.getIdToken();

  // 2. Send to Vercel proxy
  const res = await fetch(`${base}/api/chat?stream=1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages, model, stream: true }),
  });

  // 3. Parse SSE stream
  const reader = res.body.getReader();
  // ... parse "data: {...}\n\n" events
  // onDelta: called with each text chunk
  // onMetadata: called when final metadata event arrives
}
```

#### Stage 4: Metadata Extraction (server-side, no second LLM call)

After the stream completes, the server parses metadata from the response inline:

```typescript
function parseInlineMetadata(content: string): MetadataPayload {
  // 1. Try structured JSON block
  const metaMatch = content.match(/<!--ECHOOS_META(\{[\s\S]*?\})-->/);
  if (metaMatch) {
    return JSON.parse(metaMatch[1]);  // { reasoning, suggestionChips }
  }

  // 2. Fallback: keyword-based suggestion generation
  // Scan content for topic keywords → generate contextual chips
  const words = content.toLowerCase().split(/\s+/);
  const suggestions: string[] = [];
  if (words.some(w => ['movie', 'film'].includes(w)))
    suggestions.push('What movies do I watch most?');
  // ... similar for food, travel, notes, etc.

  return {
    reasoning: '',           // Not available without structured output
    confidence: 0.5,         // Neutral default
    suggestionChips: suggestions,
    referencedMemoryIds: [],
  };
}
```

**Design evolution:** Originally, the server made a **second LLM call** to a smaller model (Llama 3.1 8B) to extract metadata. This was replaced with inline parsing to reduce cost, latency, and privacy exposure. The `confidence` field is not calibrated — it's a neutral default.

### 5.4 Search Algorithm (`useSearch.ts`)

Client-side substring search across all cached timeline entries:

```typescript
function useSearch() {
  const { entries } = useTimeline();  // All entries, cached

  // Debounced query (250ms)
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);

  // Filters
  const [categories, setCategories] = useState<MemoryCategory[]>(ALL);
  const [moods, setMoods] = useState<string[]>(ALL);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{ from: number | null; to: number | null }>({ from: null, to: null });

  const results = useMemo(() => {
    return entries.filter(entry => {
      // Text match (title, subtitle, preview)
      if (debouncedQuery && !matchesQuery(entry, debouncedQuery))
        return false;
      // Category filter
      if (categories.length < 5 && !categories.includes(entry.type))
        return false;
      // Mood filter
      if (moods.length > 0 && entry.mood && !moods.includes(entry.mood))
        return false;
      // Rating filter
      if (minRating != null && (entry.rating ?? 0) < minRating)
        return false;
      // Date range filter
      if (dateRange.from && entry.date < dateRange.from) return false;
      if (dateRange.to && entry.date > dateRange.to) return false;
      return true;
    });
  }, [entries, debouncedQuery, categories, moods, minRating, dateRange]);

  return { results, filters, setQuery, toggleCategory, ... };
}
```

**Complexity:** O(n) where n = total entries. With Firebase's persistent cache, this is fast even with hundreds of entries since all data is local.

### 5.5 Analytics Charts

All charts are hand-rolled CSS/percentage-based (not canvas/Chart.js):

- **Bar charts:** `<div>` with `width: ${pct}%` animated with Framer Motion
- **Rating bars:** `<div>` with percentage width, color-coded (green >75%, blue >50%, etc.)
- **Monthly activity:** 12 flex-column bars, height animated from 0 to computed height
- **Month labels:** Single-letter abbreviations (J, F, M, A, M, J, J, A, S, O, N, D) to prevent overlap on narrow screens

### 5.6 Reminder Polling (`useReminders.ts`)

```typescript
function useReminderChecker() {
  const { data: reminders } = useReminders();

  useEffect(() => {
    const interval = setInterval(() => {
      for (const reminder of reminders ?? []) {
        if (!reminder.enabled) continue;
        const now = Date.now();
        if (now >= new Date(reminder.dueDate).getTime()) {
          // Create notification
          createNotification.mutate({
            type: 'reminder',
            title: reminder.title,
            message: reminder.message,
            reminderId: reminder.id,
          });
          // Reschedule or disable based on interval
          // ...
        }
      }
    }, 30_000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [reminders]);
}
```

**Limitation:** Only fires while the tab is open — no push notifications or background sync.

---

## 6. Component Architecture

### Route Tree

```
<RouterProvider>
├── /login → <LoginPage />                  ← Eager loaded
├── <ProtectedRoute>                         ← Redirects to /login if not authenticated
│   └── <AppLayout>                          ← Sidebar + Topbar + MobileNav + ToastContainer
│       ├── / → <DashboardPage />            ← Lazy loaded
│       ├── /chat → <ChatPage />             ← Lazy loaded
│       ├── /timeline → <TimelinePage />     ← Lazy loaded
│       ├── /movies → <MoviesPage />         ← Lazy loaded
│       ├── /food → <FoodPage />             ← Lazy loaded
│       ├── /travel → <TravelPage />         ← Lazy loaded
│       ├── /notes → <NotesPage />           ← Lazy loaded
│       ├── /wishlist → <WishlistPage />     ← Lazy loaded
│       ├── /search → <SearchPage />         ← Lazy loaded
│       ├── /analytics → <AnalyticsPage />   ← Lazy loaded
│       └── /settings → <SettingsPage />     ← Lazy loaded
├── /404 → <NotFoundPage />                 ← Lazy loaded
└── * → Navigate to /404
```

### Component Tree (per page pattern)

Each list page follows the same pattern:

```
<MoviesPage>
  ├── <PageHeader />              ← Title + subtitle + optional action button
  ├── <MovieSearchBar />          ← Search + quick-add (TMDB)
  ├── Sort/Filter Toolbar         ← Sort buttons + filter checkboxes + count
  ├── <LoadingGrid /> | <EmptyState /> | <MovieCard /> grid
  └── <MovieEditModal />          ← Shown when a card is clicked
```

Modal pattern (all 5 form modals share this structure):

```
<FoodFormModal>
  ├── Overlay (backdrop click → confirm if dirty → close)
  │   └── Modal container (glass-strong card)
  │       ├── Header (title + close button)
  │       ├── Form body (scrollable, max-h-[70vh])
  │       └── Footer (delete button | Cancel + Save buttons)
  └── <AnimatePresence>           ← Framer Motion enter/exit animations
```

---

## 7. State Management

### Three Layers

| Layer | Tool | Stores | Persistence |
|---|---|---|---|
| **Server state** | TanStack Query | Firestore data (movies, food, etc.) | In-memory cache + IndexedDB (Firestore) |
| **UI state** | Zustand | Active modal ID, command palette, toasts | None (ephemeral) |
| **Auth state** | React Context | Current user, loading state | Firebase Auth (persists session) |

### Zustand Stores

```typescript
// src/services/uiStore.ts — Modal and command palette visibility
interface UIState {
  commandOpen: boolean;      // Command palette toggle
  activeModal: string | null; // Currently open modal identifier
}

// src/services/toastStore.ts — Toast notifications
interface ToastState {
  toasts: Toast[];            // Active toast list
  addToast(toast): string;   // Add + auto-generated ID
  removeToast(id): void;     // Manual dismiss
  success(msg, action?): string;  // Convenience: success toast
  error(msg): string;             // Convenience: error toast (6000ms)
  info(msg): string;              // Convenience: info toast (4000ms)
  warning(msg): string;           // Convenience: warning toast (5000ms)
}
```

### TanStack Query Configuration

```typescript
// src/services/queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 min before refetch
      gcTime: 30 * 60 * 1000,     // Keep in cache 30 min
      refetchOnWindowFocus: false, // Don't refetch on tab switch
    },
  },
});
```

### Auth Context

```typescript
// src/hooks/useAuth.tsx
interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;  // Firebase env vars present?
}
```

---

## 8. Security Model

### Firestore Security Rules

```
rules_version = '2';

function isOwner(uid) {
  return request.auth != null && request.auth.uid == uid;
}

match /users/{uid} {
  // User can only read/write their own document
  allow read, write: if isOwner(uid);

  match /{collection}/{docId} {
    // All subcollections scoped to the same uid
    allow read, write: if isOwner(uid);

    // Nested subcollections (chats/{sessionId}/messages)
    match /{sub}/{subId} {
      allow read, write: if isOwner(uid);
    }
  }
}

// Everything else denied
match /{document=**} {
  allow read, write: if false;
}
```

Additional protections:
- `withinSize(maxLen)` — caps document field count to prevent runaway data
- `ratingValid()` — ensures rating is a number 0–10

### API Route Security

Every Vercel serverless function:
1. Reads the `Authorization: Bearer <token>` header
2. Verifies the Firebase ID token via Admin SDK
3. Extracts `uid` from the decoded token
4. Applies per-uid rate limiting (in-memory sliding window)
5. Only then processes the request

```
/api/chat:  20 req/min per uid
/api/tmdb:  30 req/min per uid
/api/delete-account: 2 req/min per uid
```

### CORS Restriction

All API routes restrict origins to:
- `https://echo-os-two.vercel.app`
- Vercel preview URLs (`https://${process.env.VERCEL_URL}`)
- `http://localhost:5173` (local dev)

### CORS Implementation

```typescript
const allowedOrigins = [
  'https://echo-os-two.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  'http://localhost:5173',
].filter(Boolean);

const origin = req.headers.origin ?? '';
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

---

## 9. API Design

### `POST /api/chat`

Groq streaming chat proxy.

**Request:**
```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "What movies did I watch this year?" }
  ],
  "model": "llama-3.3-70b-versatile",
  "stream": true
}
```

**Response (SSE):**
```
data: {"content":"Based on your movie log, this year you watched..."}
data: {"content":" several great films."}
data: {"reasoning":"I looked at all movies with 2024 watch dates...","confidence":0.5,"suggestionChips":["Which was my highest rated?","Show me my top genres"],"referencedMemoryIds":[]}
data: [DONE]
```

### `GET /api/tmdb`

TMDB API proxy.

**Query params:**
- `path` — TMDB API path (e.g., `search/movie`, `movie/123`)
- Additional params forwarded to TMDB

**Response:** TMDB JSON (passthrough)

**Path validation:** Only allows patterns matching `^[a-z]+\/[a-z0-9_]+$` or `^movie\/\d+$`

### `POST /api/delete-account`

Cascading account deletion.

**Process:**
1. Verify Firebase ID token
2. Rate limit check (2 req/min)
3. Recursively delete all subcollections under `users/{uid}` (movies, food, travel, notes, wishlist, notifications, reminders, chats, timeline)
4. Delete user profile document
5. Delete Firebase Auth user

---

## 10. AI Chat Pipeline (Detailed)

### Full Message Flow

```
User types: "What's my favorite cuisine?"
       │
       ▼
1. Save user message to Firestore
       │
       ▼
2. Load memories (cached from session start):
   fetchUserMemories(uid) → { movies, food, travel, notes, wishlist }
       │
       ▼
3. Build context:
   buildContext(bundle) → plain-text summary of all entries
       │
       ▼
4. Build system prompt:
   buildSystemPrompt(context, persona) → instructions + memories
       │
       ▼
5. Build message history:
   [system prompt] + [last 6 messages] + [user's new message]
       │
       ▼
6. Stream to Groq via /api/chat:
   POST { messages, model: "llama-3.3-70b-versatile", stream: true }
       │
       ▼
7. Receive SSE events:
   - data: {"content":"token"}  → onDelta(token)
   - ...streaming continues...
   - data: {"reasoning":"...","confidence":0.5,"suggestionChips":[...]} → onMetadata(meta)
   - data: [DONE]
       │
       ▼
8. Build assistant message object:
   { role: 'assistant', content: fullText, reasoning, confidence, suggestionChips }
       │
       ▼
9. Save assistant message to Firestore
       │
       ▼
10. Append to local messages array → UI renders
```

### Memory Context Limits

| Category | Items fetched | Order |
|---|---|---|
| Movies | 50 | Most recent `createdAt` |
| Food | 50 | Most recent `createdAt` |
| Travel | 50 | Most recent `createdAt` |
| Notes | 50 | Most recent `createdAt` |
| Wishlist | 50 | Most recent `createdAt` |

The `limit(50)` is hardcoded in `fetchUserMemories()`. This was a pragmatic choice to keep the system prompt under token limits — but it means the AI's view of the user's life silently diverges from what the app shows (which fetches all entries with no limit).

### Prompt Engineering

The system prompt instructs the model to:
1. Answer ONLY from the user's memories — never make up facts
2. Mention category and year/date when referencing a memory
3. Follow the persona's tone instruction
4. Include a structured `<!--ECHOOS_META{...}-->` block at the end with reasoning and suggestion chips

---

## 11. Testing Strategy

### Test Stack

- **Runner:** Vitest (Vite-native, fast)
- **Rendering:** @testing-library/react (user-centric queries)
- **Events:** @testing-library/user-event + fireEvent
- **Mocks:** vi.mock() for hooks, services, and browser APIs

### Test Categories

| Category | Files | Tests | Focus |
|---|---|---|---|
| **Date utilities** | `dates.test.ts` | 37 | Conversion, formatting, edge cases |
| **Cache utilities** | `cache.test.ts` | 9 | TTL, localStorage errors |
| **Analytics hook** | `useAnalytics.test.ts` | 26 | Aggregation, averages, complex scenarios |
| **Search hook** | `useSearch.test.ts` | 13 | Filtering, debounce, clear |
| **Toast store** | `toastStore.test.ts` | 18 | Add, remove, auto-dismiss, convenience methods |
| **Toast component** | `Toast.test.tsx` | 10 | Rendering, dismiss, action buttons |
| **Delete confirmation** | `FoodFormModal.test.tsx` | 9 | Confirm dialog, mutation guard |

### Testing Patterns

**Hook tests:**
```typescript
import { renderHook } from '@testing-library/react';
vi.mock('./useMovies', () => ({ useMovies: () => ({ data: [...] }) }));

const { result } = renderHook(() => useAnalytics());
expect(result.current.totalEntries).toBe(42);
```

**Component tests:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

render(<MyComponent />);
fireEvent.click(screen.getByText('Delete'));
expect(window.confirm).toHaveBeenCalled();
```

**Store tests:**
```typescript
vi.useFakeTimers();
useToastStore.getState().success('Done!');
expect(useToastStore.getState().toasts).toHaveLength(1);
vi.advanceTimersByTime(4000);
expect(useToastStore.getState().toasts).toHaveLength(0);
```

---

## 12. Performance Considerations

### Current State

| Aspect | Approach | Comment |
|---|---|---|
| **Data fetching** | Unbounded — all documents per collection | Fine at <1000 entries per user; grows slower with each query |
| **AI context** | Fixed 50 per category | Consistent latency but misses older data |
| **Charts** | Client-side CSS, no canvas | Fast, no library dependency, but limited chart types |
| **Search** | Client-side substring | O(n), instant for hundreds of entries |
| **Reminders** | Client-side polling (30s) | No cost, but only works with tab open |
| **Image caching** | TMDB posters via Workbox CacheFirst | 50 entries, 7-day expiry, offline-capable |
| **Bundle size** | Code splitting per route | Each page lazy-loaded; initial bundle ≈100 KB gzipped |

### Known Bottlenecks

1. **Dashboard/Analytics/Timeline fetch all documents** — At scale (10,000+ entries), these queries will slow down and cost more Firestore reads. Solution: pagination or aggregate counters.

2. **AI context limit** — The 50-entry cap means once a user has 500 entries, the AI only sees 10% of them. Solution: semantic search with embeddings + cosine similarity.

3. **In-memory rate limiting** — Vercel serverless functions are stateless; the in-memory `Map` works for single-instance deployments but won't persist across function cold starts or multi-region deployments. Production should use Vercel KV or a Firestore counter.

4. **No pagination on list pages** — Movie/food/travel/notes/wishlist pages fetch all entries. At scale, this will slow initial loads. Solution: infinite scroll with Firestore pagination (`startAfter`).

---

## 13. Known Limitations

| Limitation | Impact | Workaround |
|---|---|---|
| No push notifications | Reminders only fire while tab is open | None |
| No semantic search | Search is substring-only — no typo tolerance or semantic matching | None |
| AI context truncated at 50/category | Older entries invisible to AI | None (would need embedding search) |
| In-memory rate limiting | Not reliable across Vercel cold starts | Deploy Vercel KV |
| No account recovery for guests | Guest data lost if browser cache cleared | Upgrade to Google account |
| No pagination on list pages | Slower loads with 1000+ entries | Manual pagination todo |
| No undo for deletions | Deletions are permanent (though confirmed) | Future: soft-delete with trash |
| Reminder polling only 30s | Up to 30s delay before reminder fires | None |
| No dark/light mode auto-switch | Must toggle manually in Settings | Future: system preference detection |

---

## Deployment

### Auto-deploy to Vercel

This project is connected to Vercel via Git. **Every push to `master` automatically triggers a production deployment.**

- **Production:** Any commit pushed to `master` is built and deployed to the production URL
- **Preview:** Pull request branches automatically get preview deployments with unique URLs
- **Environment variables:** Set in Vercel dashboard — never committed to the repo

> [!NOTE]
> There is no manual deploy step. Simply `git push` and Vercel handles the rest. Check the deploy status in your Vercel dashboard or GitHub Actions.

---

## 14. Future Architecture Considerations

### Priority 1: Scalability
- Add Firestore pagination (`startAfter`, `limit(20)`) to all list pages
- Add aggregate counters (denormalized counts per category in the user profile doc)
- Move rate limiting from in-memory Map to Vercel KV (or Firestore counter)

### Priority 2: AI Improvements
- Implement semantic search: generate embeddings for each entry → store in `embedding[]` field → cosine similarity retrieval for AI context
- Replace the 50-entry cap with dynamic retrieval: choose the N most relevant entries per query
- Support multi-turn conversation with better context windowing

### Priority 3: Engagement
- Push notifications via Firebase Cloud Messaging + Service Worker
- Dark/light mode auto-switching based on `prefers-color-scheme`
- Weekly email digest of new memories and insights (requires a cron job)
- Import/export from other services (Letterboxd, Goodreads, etc.)

### Priority 4: Platform
- React Native or Capacitor for native mobile app
- Cloud Functions for server-side reminder processing
- S3/R2 backup of Firestore data

---

*EchoOS v0.1.0 — Architecture document for AI-assisted development.*
