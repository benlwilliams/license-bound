# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (runs on :5173 or next available port)
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build

# Firebase Cloud Functions (run from project root)
firebase deploy --only functions   # Deploy/redeploy the parseLogImage function
firebase emulators:start           # Run functions locally for testing
```

No test runner is configured. Logic is verified manually via browser console.

## Deployment

- **Hosting**: Netlify, auto-deploys from GitHub `main` branch. URL: `license-bound.netlify.app`
- **`netlify.toml`** — defines build command, publish dir (`dist`), and functions dir (`netlify/functions`)
- **Netlify Functions** — three server-side functions in `netlify/functions/` for iOS PWA auth (see Auth Persistence below). `firebase-admin` is a dependency of `netlify/functions/package.json` only — NOT the root — to keep frontend builds fast. The root `package.json` also includes it as a fallback for Netlify's bundler.
- **Netlify env vars required**: `VITE_FIREBASE_*` (6 Firebase client config vars) + `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Firebase Admin service account for session cookie functions)

## Stack

- **Vite + React 19** — plain JavaScript (no TypeScript)
- **Tailwind CSS v4** — config lives entirely in `src/index.css` (no `tailwind.config.js`); dark mode via `class` strategy on `<html>` toggled by `uiStore`
- **shadcn/ui** — style `base-nova`, components in `src/components/ui/`. Add new components with `npx shadcn@latest add <name>`. A custom `SheetBody` component was added to `sheet.jsx` to provide consistent `px-4 pb-6` padding inside bottom sheets — always use it instead of raw `<div>` wrappers.
- **Zustand** — four stores in `src/store/`: `authStore`, `profileStore`, `sessionStore`, `uiStore`. `profileStore` and `uiStore` use the `persist` middleware (localStorage).
- **Firebase v12** — modular SDK. `familyId` = Firebase Auth `uid`. All Firestore data lives under `families/{familyId}/{drivers|supervisors|sessions}`. Security rules enforce `request.auth.uid == familyId`. Project ID: `licensebound-87332`.
- **Firebase Cloud Functions v2** — in `functions/` (Node 20, ESM). One function: `parseLogImage` (httpsCallable). API key stored in `functions/.env` (gitignored), auto-loaded at deploy time — do NOT use Secret Manager. See `functions/index.js`.
- **Firebase Admin SDK** — used only in `netlify/functions/` for session cookie management. Credentials come from Netlify env vars, NOT from a committed key file.
- **Anthropic SDK** (`@anthropic-ai/sdk`) — used only inside the Cloud Function. Model: `claude-opus-4-5`. Images sent as `type: "image"` blocks; PDFs sent as `type: "document"` blocks. Responses wrapped in `<sessions></sessions>` tags for reliable JSON extraction.
- **Dexie.js** — IndexedDB wrapper in `src/db/offlineDB.js`. Booleans must be stored as `0`/`1` (not `true`/`false`) for Dexie indexed `where()` queries — see `syncedToCloud` handling.
- **HashRouter** — all routes use `/#/path` so the app works offline from cached files.
- **SunCalc** — calculates sunset/sunrise from lat/lng + date locally with no network call, used in `src/services/nightHours.js`. **Always pass noon (12:00:00) — not midnight — as the reference time** to avoid Julian Day boundary errors across UTC offsets.

## Architecture

### Data flow
Screens → Zustand stores → Firebase Firestore (online) / Dexie IndexedDB (offline). The sync service (`src/services/sync.js`) flushes Dexie records with `syncedToCloud === 0` to Firestore when the device reconnects, triggered by `useSyncOnReconnect`. A manual "Sync to cloud" button in Settings lets the user force a sync with visible feedback.

### Auth persistence (iOS PWA)

iOS Safari aggressively clears PWA storage (IndexedDB, localStorage), logging users out. The solution is server-side session cookies:

1. **Sign-in** (`Auth.jsx`): after Firebase Auth sign-in succeeds, `createServerSession(user)` POSTs the Firebase ID token to `/.netlify/functions/create-session`. The function uses Firebase Admin to create a 14-day `HttpOnly; SameSite=Strict` session cookie on the Netlify domain.

2. **App startup** (`authStore.js`): `onAuthStateChanged` fires. If Firebase finds no session (iOS cleared IndexedDB), the store calls `/.netlify/functions/verify-session`. The function verifies the cookie and returns a Firebase custom token. The client calls `signInWithCustomToken(auth, customToken)`, which triggers `onAuthStateChanged` again with the user.

3. **Sign-out** (`auth.js`): calls `/.netlify/functions/delete-session` to clear the cookie before signing out of Firebase.

4. **Auth initialization**: uses `initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })` — sets persistence synchronously at startup, no async race condition.

5. **Email pre-fill**: on sign-in with Remember Me, email is saved to `localStorage` under key `lb_email` and pre-filled on the auth screen so re-login is fast even if the cookie somehow fails.

**Netlify function files**: `netlify/functions/create-session.mjs`, `verify-session.mjs`, `delete-session.mjs`

### Firestore queries — no composite indexes
The `getSessions` query uses only `where('driverId', '==', driverId)` with **no `orderBy`**. Adding `orderBy('date')` would require a composite index that doesn't exist and would cause silent query failures (falling back to local Dexie). All sorting is done client-side in `SessionHistory.jsx`.

### The two driving logs
The Texas DPS program has **two completely separate logs** — they never share credit:
- **DL-91B** (`dl91b-observation` | `dl91b-instruction`): 14 hours total with the licensed parent instructor. Daily cap: 4 hrs total, 2 hrs instruction.
- **30-Hour Practice** (`practice-30hr`): 30 hours with any qualified adult 21+, at least 10 hrs at night. Daily cap: 2 hrs.

Every session has exactly one `logType`. The `totalMinutes` field records the full drive duration; `countedMinutes` records how much counts toward the log after the daily cap is applied.

### Screens and routes
| Route | Screen | Purpose |
|---|---|---|
| `/` | `Dashboard` | Progress rings, pace projection, quick-log FAB |
| `/history` | `SessionHistory` | Filterable session list |
| `/session-detail` | `SessionDetail` | View/edit/delete a single session |
| `/manual-entry` | `ManualEntry` | Manual session entry form |
| `/session/pre` | `PreSession` | Pre-drive checklist + supervisor select |
| `/session/live` | `LiveSession` | GPS tracking during active drive |
| `/session/summary` | `SessionSummary` | Post-drive summary + save |
| `/profiles` | `Profiles` | Manage drivers and supervisors |
| `/readiness` | `RoadTestReadiness` | Road test eligibility checklist |
| `/export` | `PDFExport` | Print/save DL-91B and 30-hr PDF reports |
| `/settings` | `Settings` | App settings, dark mode, sync, import, export, sign out |
| `/import` | `LogImport` | Photo/PDF import of paper logs via Claude Vision |

### Paper log import flow (`LogImport.jsx`)
Phase state machine: `upload` → `analyzing` → `review` → `done`.

1. User selects form type (`dl91b` or `practice-30hr`) and uploads a photo or PDF.
2. `parseLogImage` Cloud Function (in `src/firebase/functions.js`) sends the file to Claude Vision.
3. Claude returns a JSON array of extracted sessions inside `<sessions>` tags.
4. User reviews one card at a time — amber ring on low-confidence entries. Supervisor auto-matched by license number against `profileStore.supervisors`.
5. Each confirmed session runs through `calcCountedMinutes` (same cap logic as ManualEntry) before calling `sessionStore.saveSession()`. Because Zustand updates optimistically, same-day cap calculations are correct even when importing multiple sessions on the same date.

### Calculation engine (`src/services/`)
- `capRules.js` — `calcCountedMinutes(newSession, todaysSessions)` applies the correct daily cap given a session's logType and what's already been logged that day. `recalcDaySessions()` recomputes the whole day when a session is edited or deleted.
- `progress.js` — `getProgress(sessions)` aggregates all sessions into progress fractions. `getPaceProjection()` uses a 14-day rolling average. `earliestTestDate` is always 44 calendar days from the driver's first-ever session.
- `nightHours.js` — `calcNightMinutes(dateStr, lat, lng, startMs, endMs)` returns the overlap between a drive and the night window (30 min after sunset → 30 min before sunrise). Only applied to `practice-30hr` sessions. Pass noon as the SunCalc reference time to avoid timezone boundary bugs.

### PDF export (`PDFExport.jsx`)
Two `SessionTable` components per export:
- **DL-91B** columns: Date | Supervisor/License | Start | End | Duration
- **30-hr** columns: Date | Supervisor/License | Start | End | Day Hours | Night Hours

Day Hours per row = `totalMinutes − nightMinutes`. These columns are the source of truth; there is no separate "Counted" column.

### Session data model key fields
```js
{
  sessionId, driverId, supervisorId,
  logType,           // 'dl91b-observation' | 'dl91b-instruction' | 'practice-30hr'
  date,              // 'YYYY-MM-DD'
  startTime, endTime, // ISO timestamps
  totalMinutes,      // full drive duration
  countedMinutes,    // after daily cap — this is what progress tracking uses
  nightMinutes,      // practice-30hr only
  gpsRoute,          // [{lat, lng, timestamp}, ...] — empty array for manual entries
  syncedToCloud,     // boolean (0/1 in Dexie, boolean in Firestore)
}
```

### `@/` path alias
Resolves to `src/`. Configured in `vite.config.js` and `jsconfig.json`.
