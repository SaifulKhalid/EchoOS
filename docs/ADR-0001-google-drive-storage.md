# ADR-0001: Google Drive as Primary Personal Storage

- **Status:** Proposed (not yet implemented)
- **Date:** 2026-08-01
- **Author:** EchoOS Architecture
- **Deciders:** Project lead / evaluation committee
- **Related docs:** `ARCHITECTURE.md`, `README.md`, `firestore.rules`, `src/services/firestore/*`, `src/memory/*`

---

## 1. Context

The EchoOS Master Development Prompt defines a **privacy-first personal archive** with a
non-negotiable core philosophy:

> *"No personal archive should be permanently stored in our own backend. The backend should
> only manage authentication, API routing, AI requests, rate limiting, and logging without
> personal content."*

The mandated storage model is **Google Drive**: users authenticate with Google OAuth, grant
Drive access, and EchoOS stores all personal data (`movies.db`, `food.json`, …) inside an
app-specific folder in **their own Drive**.

### Current State (v0.1)

The existing implementation stores **all personal data in Firestore** under `users/{uid}/…`:

| Collection | Purpose |
|---|---|
| `movies` / `food` / `travel` / `notes` / `wishlist` | Personal archive entries |
| `chats/current/messages` | Chat history |
| `notifications` / `reminders` | App metadata |
| `users/{uid}` | Profile doc |

This directly contradicts the master prompt's primary competitive advantage: today the
backend *does* hold every user's personal archive in a centralized database.

### Facts verified for this decision (Drive API v3)

| Fact | Detail |
|---|---|
| **`drive.file` scope** | Access only to files the app created or the user explicitly opened with the app (via the Drive Picker). Least-privilege, user-visible. |
| **`drive.appfolder` scope** | Access to the hidden `appDataFolder` — invisible in the Drive UI, hidden from other apps, but counts against the user's Drive quota. |
| **Optimistic concurrency** | `files.update` supports `If-Match: [etag]`; a concurrent modification returns **HTTP 412 Precondition Failed**. |
| **Change detection** | `files.get`/`files.list` with `fields=etag,revisionId,id,name,modifiedTime` gives lightweight metadata for sync without payload downloads. `changes.list` with a stored `pageToken` tracks bulk changes efficiently. |
| **Quota (free tier)** | ~20,000 queries / 100 s / user; 15 GB free Drive storage. Generous for a personal archive. |
| **Token lifecycle** | Firebase Auth's browser SDK exposes a short-lived access token for Google providers but **not a durable refresh token**. Durable Drive access therefore requires a **server-side OAuth authorization-code flow with `access_type=offline`**. |

---

## 2. Decision Drivers

1. **Master prompt mandate** — user ownership, transparency, no centralized personal data.
2. **Least privilege** — grant only what EchoOS needs (`drive.file`, not full Drive access).
3. **Transparency** — the user must be able to *see* their archive (a visible "EchoOS" folder), per the prompt's "Ownership" and "Transparency" principles.
4. **Developer experience / evaluation quality** — clean interfaces, SOLID, testable sync engine.
5. **No regression** of current UX: search, analytics, timeline, AI chat, offline support must keep working.

---

## 3. Decision

**Move personal archive storage to Google Drive** using:

- **A visible `EchoOS` folder** in the user's My Drive (not the hidden appDataFolder), created by the app on first connect.
- The **`drive.file` scope** (least privilege; files are created by the app so they're all accessible).
- **One JSON file per category** (`movies.json`, `food.json`, `travel.json`, `notes.json`, `wishlist.json`, `chats.json`, `reminders.json`, `notifications.json`, plus `manifest.json`), human-readable for transparency.
- A **server-side OAuth authorization-code flow** (via the existing Vercel backend) that obtains and stores a durable refresh token, and mints short-lived access tokens for the browser.
- A **client-side sync engine** backed by an **IndexedDB mirror** so the app reads/writes locally (fast, offline-capable) and reconciles with Drive in the background.
- **Firestore demoted from primary store to optional auto-backup**, then decommissioned for personal data in a later phase.

> **Why not the hidden `appDataFolder`?** The master prompt explicitly values *transparency and
> ownership* — "your data belongs to you." A user-visible folder is the strongest demonstration
> of that value and simplifies user trust (they can browse, copy, or delete their archive
> directly). `appDataFolder` remains a documented alternative if maximum obscurity is ever
> preferred.

> **Why a server-side token flow?** Verified: Firebase's browser SDK does not persist a refresh
> token for Google sign-in, and access tokens expire after ~1 hour. A client-only approach would
> force re-consent prompts or silent re-auth failures. Storing the refresh token **encrypted,
> server-side, scoped to uid** is standard OAuth practice, is *not* personal archive content, and
> fits the master prompt's allowance that the backend manages "authentication."

> **Consistency note:** the current app reads Firestore with one-shot `getDocs` (no realtime
> `onSnapshot` listeners anywhere), so the pull-based sync cadence (~60 s + focus + after-write)
> introduces **no regression of realtime UX** — there is none today. This strengthens the case
> for the sync engine as designed.

---

## 4. Target Architecture

```
┌──────────────────────────── Browser (SPA) ────────────────────────────┐
│                                                                        │
│  React UI ──> Hooks (useMovies, …) ──> MemoryRepository (interface)    │
│                                            │                           │
│                          ┌─────────────────┴─────────────────┐         │
│                          │      DriveRepository              │         │
│                          │  (reads/writes IndexedDB mirror,  │         │
│                          │   syncs to Drive in background)   │         │
│                          └───────┬─────────────────┬─────────┘         │
│                                  │ read/write     │ 1. get access     │
│                           IndexedDB mirror        │    token          │
│                           (offline, search, AI)   ▼                   │
│                                    │      ┌──────────────┐            │
│                                    │      │ /api/drive/  │            │
│                                    │      │ token        │            │
│                                    │      └──────┬───────┘            │
└────────────────────────────────────┼─────────────┼────────────────────┘
                                     │             │ (Firebase ID token verified)
                                     ▼             ▼
                        ┌───────────────────────────────┐
                        │        Google Drive API       │
                        │  My Drive/EchoOS/*.json       │  ← user's own data
                        └───────────────────────────────┘
                                     ▲
                        ┌────────────┴────────────┐
                        │  Vercel backend          │
                        │  /api/drive/oauth-init   │  (authorization-code flow)
                        │  /api/drive/callback     │  (exchange code → tokens)
                        │  /api/drive/token        │  (mint access token)
                        │  /api/drive/revoke       │  (delete refresh token)
                        │  ─ encrypted token store ─│
                        └──────────────────────────┘
```

**Key property:** personal content flows **browser ⇄ Google Drive directly**. Our backend
handles only auth, tokens, AI proxying, and rate limiting — exactly the master prompt's
definition. The IndexedDB mirror is a local cache of the user's own Drive files.

---

## 5. Detailed Design

### 5.1 Drive folder & file layout

```
My Drive/
└── EchoOS/                      (created by app on first connect)
    ├── manifest.json            { schemaVersion: 1, categories: […], updatedAt }
    ├── movies.json              [ { id, title, rating, … }, … ]
    ├── food.json
    ├── travel.json
    ├── notes.json
    ├── wishlist.json
    ├── chats.json
    ├── reminders.json
    └── notifications.json
```

- `manifest.json` is the sync anchor: its `revisionId`/`etag`/`updatedAt` tells every client the
  archive state at a glance.
- **Schema versioning** in the manifest enables forward-compatible migrations (future
  categories: books, music, places, goals, journal).
- **Size guardrail:** if a category file exceeds ~4 MB (thousands of entries), split by year
  (`movies-2026.json`, …) — documented, deferred, not needed for the first release.
- IDs: keep existing Firestore-style string IDs (`doc-id`) so `referencedMemoryIds`, timeline
  links, and any legacy references stay valid.

### 5.2 Token lifecycle (server-side OAuth)

```
User clicks "Connect Google Drive"
   │
   ▼
GET /api/drive/oauth-init   (verifies Firebase ID token, sets HMAC-signed state)
   │
   ▼  302 → Google OAuth (scope=drive.file, access_type=offline, prompt=consent)
Google consent page
   │
   ▼
GET /api/drive/callback?code=…&state=…  (verifies state signature, exchange code)
   │
   ├─ success → encrypt refresh_token (AES-GCM, key from env) → store keyed by uid
   │            → 302 back to /settings?drive=connected
   │
   └─ error   → 302 back to /settings?drive=error
```

- **Access tokens** are minted on demand at `GET /api/drive/token` (Firebase ID-token verified,
  per-uid rate-limited), cached server-side until ~5 min before expiry. Wrap the refresh in a
  **mutex** so concurrent token requests don't hammer the OAuth refresh endpoint.
- **OAuth `state` — serverless-safe:** Vercel functions are stateless, so the CSRF nonce cannot
  live in an in-memory map (it would die on cold start). Use an **HMAC-signed state token**
  (`HMAC(uid ‖ nonce, DRIVE_STATE_SECRET)`), validated on the callback before exchanging the
  code. No server-side session storage required.
- **Revoked-token recovery:** if Google returns 401 on refresh (user revoked access in Google
  account settings), delete the stored token, mark the connection invalid, and surface a
  "Reconnect Drive" prompt. Never silently loop.
- **Revocation:** `POST /api/drive/revoke` deletes the stored refresh token (no Google API call
  needed for app-side deauth; optionally call the Google `revoke` endpoint).
- **Account deletion** (`/api/delete-account`): delete the token; **leave the user's Drive files
  in place** — they own them. Offer an optional "also delete the EchoOS folder" checkbox.
- **Deployment prerequisite (Google Cloud Console):** provision a dedicated **OAuth Client ID
  (web application)** and consent screen for the Drive scope, and register
  `…/api/drive/callback` as an authorized redirect URI. This is a one-time setup step, not
  covered by Firebase's existing Google client.

**Security requirements for the token store:**

- Encrypt at rest (AES-GCM), key from `DRIVE_TOKEN_ENCRYPTION_KEY` env var (never committed).
- Store in a *separate* location from Firestore personal data — e.g., Vercel KV or a Firestore
  collection used *only* for tokens (`_tokens/{uid}`), excluded from export and search.
- Never log tokens or token fragments. Never send tokens to Groq/TMDB or the client beyond the
  requesting browser (and even then only short-lived access tokens).

### 5.3 Client sync engine (`src/services/drive/`)

New module, feature-scoped:

```
src/services/drive/
├── token.ts              # getAccessToken(): cached fetch from /api/drive/token
├── driveClient.ts        # thin fetch wrapper over Drive API v3 (files.get/update/create,
│                         #   changes.list) with bearer + If-Match support
├── localStore.ts         # IndexedDB mirror: entities, fileMeta, outbox queue
├── syncEngine.ts         # pull (changes/etag) + push (debounced outbox) reconciliation
├── repository.ts         # DriveRepository implements MemoryRepository (see 5.4)
└── types.ts
```

**Read path (pull):**

1. `syncEngine.pull()` calls `files.list` with `q="'<folderId>' in parents"` and
   `fields=files(id,name,etag,revisionId,modifiedTime)`. **Prefer `files.list` + etag-compare
   over `changes.list`**: since the app created the folder and every file, a scoped listing is
   stateless (no per-user `startPageToken` to persist) and works cleanly with the `drive.file`
   scope. `changes.list` remains a later optimization, not the primary mechanism.
2. Compare each file's `etag`/`revisionId` against the IndexedDB `fileMeta` cache.
3. Only download payloads for changed/new files; parse JSON; write entities to IndexedDB.
4. On first connect do a full pull. Trigger pull: on app focus, on an interval (~60 s), after
   a push, and a manual "Sync now" button.

**Write path (push):**

1. Every `add/update/delete` writes to the IndexedDB **outbox** and applies optimistically to
   the mirror (instant UI, same TanStack Query UX as today).
2. A **debounced flusher** (~2 s idle) processes the outbox: fetch latest `etag`, write the
   whole category file via `files.update` with `If-Match: <etag>`.
3. **Atomic writes:** `files.update` with a mid-upload network drop can leave a truncated
   `movies.json` in the user's *actual archive*. Mitigate by writing the new payload to a temp
   file (`movies.json.tmp`), verifying it (round-trip parse), then promoting it in place
   (delete + create, or `files.update` after verification); on failure, re-push or surface an
   error without touching the live file.
4. **Conflict (HTTP 412):** pull the server version, **merge per-file**:
   - Entries added on the server (other device) → take server's.
   - Entries we modified and the server hasn't → take ours.
   - Same entry modified both sides → last-`updatedAt` wins, tie-broken by monotonic id to
     avoid clock-skew loss; record a one-time toast "Merged changes from your other device."
   - Then retry with the new etag. (Per-entry JSON is mergeable by `id` — this is the core
     advantage of JSON files over binary blobs.)

**Offline behavior:** the IndexedDB mirror is the single source for reads (search, analytics,
timeline, AI all read it) — the app remains fully functional offline. Pushes queue in the
outbox and flush on reconnect. This replaces Firestore's `persistentLocalCache` role.

### 5.4 Repository abstraction (the key refactor)

Today `src/services/firestore/*.ts` are concrete modules directly imported by hooks and the
memory retriever. Introduce one interface and two implementations:

```ts
// src/services/memory/types.ts
export interface MemoryRepository {
  fetchAll<T>(uid: string): Promise<T[]>;
  add<T>(uid: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  update<T>(uid: string, id: string, data: Partial<T>): Promise<void>;
  delete(uid: string, id: string): Promise<void>;
}

// Implementations
FirestoreRepository   // existing code, unchanged behavior (transition/backup)
DriveRepository       // new: IndexedDB mirror + sync engine
```

- Hooks (`useMovies`, `useFood`, …) and `memoryRetriever` depend on the **interface** via a
  single injection point (e.g., a `getRepository()` factory chosen by a feature flag /
  user's storage mode).
- The **memory pipeline** (`memoryRetriever`) switches from Firestore queries to reading the
  IndexedDB mirror — same `orderBy createdAt desc` semantics, now applied in memory. This keeps
  AI retrieval fast and keeps personal data out of our backend.

### 5.5 Guest mode (anonymous users)

Anonymous users have no Google account — there is no Drive to sync to. Decision:

- **Guest data stays purely local** in IndexedDB (device-local by definition; no backend
  involvement at all). This is *more* privacy-pure than today's Firestore guest accounts.
- **Upgrade guest → Google:** existing `linkWithRedirect` keeps the same uid; on first Google
  sign-in, create the Drive folder and **one-time upload** of the local IndexedDB archive, then
  switch to Drive mode. (Same mechanism used to migrate current Firestore users.)

### 5.6 Migration plan (existing Firestore users)

| Step | Action |
|---|---|
| 0 | Ship repository interface; both backends run; default remains Firestore (no behavior change). |
| 1 | "Connect Google Drive" in Settings → after consent, backend exports that user's Firestore collections to JSON and uploads to `EchoOS/` in their Drive. Firestore stays the write path; Drive is updated via **periodic snapshot sync** (after N mutations or on the sync tick) — not per-mutation dual-writes, which would recreate the conflict problem in reverse. |
| 2 | User (or flag) switches storage mode to Drive; app now reads/writes Drive + IndexedDB mirror. |
| 3 | Firestore copy retained as **automatic backup** for 30 days, then optionally purged (with user-visible notice). |
| 4 | Decommission personal-data collections in Firestore; keep only `users/{uid}` profile + token store. |

Migration is **per-user, on-demand, reversible** (a "Use Firestore backup" fallback toggle).

### 5.7 Backend surface (new endpoints, all Firebase-ID-token-verified + rate-limited)

| Endpoint | Purpose |
|---|---|
| `GET /api/drive/oauth-init` | Start OAuth redirect (state + nonce). |
| `GET /api/drive/callback` | Exchange code → store encrypted refresh token. |
| `GET /api/drive/token` | Mint short-lived access token (cached). |
| `POST /api/drive/revoke` | Delete stored token (disconnect). |
| `POST /api/drive/migrate` | One-time Firestore → Drive export/upload. |

### 5.8 Security review checklist

- [x] `drive.file` scope only (least privilege) — verified semantics.
- [ ] Refresh token encrypted at rest; key from env; never logged.
- [ ] `state` parameter + nonce binding on OAuth redirects (CSRF protection).
- [ ] CORS kept to allowed origins (existing pattern in `api/chat.ts`).
- [ ] Rate limit all new endpoints per uid (in-memory now, Vercel KV later — documented gap).
- [ ] Input validation: category names restricted to a fixed allowlist (no path traversal via
      `name` in Drive calls).
- [ ] Personal content never transits our backend: data flows browser ⇄ Drive directly.
- [ ] **XSS blast radius:** a short-lived Drive access token in the browser means any XSS can
      read the user's *entire archive* — worse than today's Firestore rules. Mitigate with a
      strict CSP, no `dangerouslySetInnerHTML`, and **keep the access token in memory only**
      (never localStorage).
- [ ] "Disconnect Drive" and "Delete account" flows tested end-to-end (token erased; Drive
      files left to the user or deleted only on explicit request).

### 5.9 Performance & quota

- **Reads:** local-first (IndexedDB) → Drive only on pull; `etag`-based skip saves bandwidth.
- **Writes:** whole-file rewrite per category, debounced; at personal-archive scale (≤ a few
  thousand entries) this is < 100 KB/file and comfortably inside Drive quota
  (~20k queries/100 s/user; each mutation = ~2–3 queries).
- **AI chat:** reads the local mirror; no Drive latency added to the pipeline.

---

## 6. Trade-offs & Honest Risks

| Risk | Mitigation |
|---|---|
| **No realtime push** — Drive has no event stream; sync is pull-based (60 s + focus + after-write). | Acceptable for a personal archive; UI reflects local mirror instantly, reconciliation is background. Document as known limitation. |
| **Cross-device conflicts** — whole-file updates can clobber. | `If-Match` etag + per-entry merge by `id` + last-write-wins with user-visible merge toast. |
| **Token storage on backend** — a stored refresh token is a credential. | Encrypt at rest, least-privilege scope, revocable, deleted on disconnect; it is *not* personal content. |
| **Firebase SDK lacks durable refresh tokens for Google** (verified). | Server-side authorization-code flow is the standard remedy. |
| **Migration complexity** — dual backends during transition. | Repository interface isolates the change; phased rollout; reversible per user. |
| **IndexedDB mirror divergence** — local cache can go stale. | `etag`-based pull + `changes.list` pageToken + manual "Sync now". |
| **Guest data is device-bound** — clearing browser data loses it. | Same caveat as today's guest mode; upgrade path to Google is the answer. |

---

## 7. Testing Strategy

- **Unit:** `syncEngine` (etag skip, 412 merge matrix, outbox ordering, debounce), `localStore`
  (IndexedDB CRUD + migration), `repository` (Firestore ↔ Drive parity with fake transports).
- **Integration (mocked Drive API):** full pull/push cycles, conflict scenarios (412 merge
  matrix incl. clock-skew tie-breaks), **atomic-write failure injection** (truncated upload →
  temp-file recovery), revoked-token 401 handling, offline→online flush, guest→Google upgrade
  upload.
- **E2E (manual + browser):** connect flow, "Sync now", two-browser conflict, disconnect,
  account deletion (Drive files untouched), Firestore backup fallback.
- **Existing suite** (85+ tests) must keep passing through the repository abstraction.

---

## 8. Phased Rollout

| Phase | Scope | Exit criteria |
|---|---|---|
| **0** | ADR accepted; `MemoryRepository` interface + factory; no behavior change. | Typecheck + full test suite green. |
| **1** | Backend OAuth endpoints + token store; Drive client; IndexedDB mirror; "Connect Drive" + "Sync to Drive" backup (Firestore stays primary). | User can connect, see `EchoOS/` folder populated; app behavior unchanged otherwise. |
| **2** | `DriveRepository` becomes the read/write path for Google users (flag or default); Firestore = auto-backup. | Search/analytics/timeline/AI/offline verified against Drive-backed data. |
| **3** | Guest local-only mode; migrate Firestore users on demand; decommission personal-data collections. | New users never touch Firestore; existing users migrated or opted out. |

---

## 9. Future Considerations (aligned with master prompt)

- **New categories** (books, music, places, goals, journal) become *new JSON files* — the
  manifest schema version makes this a non-breaking addition.
- **Multi-provider AI** is unaffected — the pipeline reads the local mirror.
- **Encrypted client-side archive** (e.g., users' passphrase-wrapped JSON) is a future
  privacy-hardening option; documented, not in scope now.
- **Import/export** (Letterboxd, Goodreads) becomes trivial: import writes JSON files.
- **PWA background sync** (service worker + Periodic Background Sync) can replace the 60 s
  poll when supported.

---

## 10. Open Questions for Decision

1. **Storage mode default** — should Google users auto-migrate to Drive (Phase 2) or opt in?
   (Recommendation: prompt once on connect, then auto for new Google users.)
2. **Firestore purge timing** — 30 days backup retention acceptable, or keep Firestore backup
   indefinitely at zero cost (Spark free tier)?
3. **Merge policy** — per-entry last-write-wins (recommended) vs. showing a manual conflict UI?
4. **Token store location** — Vercel KV (recommended, durable) vs. isolated Firestore
   `_tokens/{uid}` collection (simpler, same stack)?

---

## 11. References

- Google Drive API v3 docs (scopes `drive.file` / `drive.appfolder`, `files.update` etag /
  `If-Match`, `changes.list`, quota limits) — verified via docs research, 2026-08.
- Google OAuth 2.0 for Web Server Applications (`access_type=offline`).
- Firebase Authentication docs — Google provider access tokens, no durable refresh token in
  the browser SDK (verified limitation driving decision in §3).
- `ARCHITECTURE.md` (current Firestore architecture this ADR supersedes for personal data).
