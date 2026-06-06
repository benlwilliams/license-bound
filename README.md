# LicenseBound

A mobile-first web app for tracking Texas teen driver education hours — built for parents and students navigating the state's two-log system.

## The Problem

Texas requires teen drivers to complete two separate hour logs before they can take the road test:

- **DL-91B** — 14 hours supervised by a licensed parent, with a 4 hr/day cap and a 2 hr/day cap specifically on instruction time
- **30-Hour Practice** — 30 hours with any qualified adult 21+, with at least 10 of those hours at night, capped at 2 hrs/day

These logs are tracked on paper, the rules are confusing, and families routinely under- or over-count hours. LicenseBound replaces the paper log with a real-time tracker that enforces the rules automatically.

## Features

- **Live GPS session tracking** — start a drive, let the app run in the background, stop when done
- **Manual entry** — add past sessions with date, time, and supervisor
- **AI-powered paper log import** — photograph an existing paper DL-91B or 30-hour log; Claude Vision extracts every session, matches supervisors by license number, and flags low-confidence entries for review
- **Daily cap enforcement** — the calculation engine correctly applies each log's daily cap, including the instruction-within-DL91B sub-cap, and recalculates all sessions on a day when one is edited or deleted
- **Night hours** — automatically calculates how many minutes of a practice session fell between 30 min after sunset and 30 min before sunrise using SunCalc (no network call required)
- **Road test projection** — shows earliest allowed test date (44 days from first session) and projects completion date based on a 14-day rolling pace average
- **PDF export** — generates printable DL-91B and 30-hour log reports formatted for submission
- **Offline-first** — all data is written to IndexedDB first; a sync service flushes to Firestore when the device reconnects
- **Dark mode** — system preference respected by default, toggleable in settings

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 19 + Vite | Fast dev builds; React 19 concurrent features |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility-first with accessible components; config lives entirely in `index.css` |
| State | Zustand | Minimal boilerplate; `persist` middleware handles localStorage sync for profiles and UI preferences |
| Backend | Firebase (Auth + Firestore) | Anonymous auth so families don't need to create accounts; Firestore security rules enforce per-family data isolation |
| Cloud Function | Firebase Functions v2 (Node 20) | Keeps the Anthropic API key off the client |
| AI | Anthropic Claude Vision | Parses handwritten/typed paper logs into structured session data |
| Local DB | Dexie.js (IndexedDB) | Offline writes with indexed queries; booleans stored as 0/1 for Dexie `where()` compatibility |
| Maps | react-leaflet | GPS route display with no API key required |
| Solar data | SunCalc | Sunrise/sunset calculated locally from lat/lng — no network needed, no API quota |
| Routing | HashRouter | All routes use `/#/path` so the app works from a cached file without a server |

## Architecture

```
src/
├── screens/          # One file per route
├── components/
│   ├── ui/           # shadcn/ui primitives
│   ├── layout/       # AppShell, BottomNav
│   └── common/       # Shared utility components
├── store/            # Zustand stores (auth, profile, session, ui)
├── services/
│   ├── capRules.js   # Daily cap calculation engine
│   ├── progress.js   # Aggregation, pace projection, road test date
│   ├── nightHours.js # SunCalc-based night minute calculation
│   └── sync.js       # Dexie → Firestore sync
├── firebase/         # Firebase SDK wrappers
└── db/
    └── offlineDB.js  # Dexie schema and queries
functions/
└── index.js          # parseLogImage Cloud Function (Claude Vision)
```

### Data flow

Screens write to Zustand → Dexie (immediate, offline-safe) → Firestore (via sync service on reconnect).

All Firestore data lives under `families/{familyId}/{drivers|supervisors|sessions}`. The `familyId` is the Firebase Auth UID. Security rules reject any request where `request.auth.uid !== familyId`.

### Cap rules engine

`src/services/capRules.js` implements `calcCountedMinutes(newSession, todaysSessions)` — given a new session and all other sessions already recorded for that driver on that date, it returns how many minutes count toward the log after applying the correct daily cap. `recalcDaySessions()` re-runs the calculation for an entire day when a session is edited or deleted, processing sessions in chronological order so earlier drives consume the cap first.

### Paper log import flow

`LogImport.jsx` runs a four-phase state machine: `upload → analyzing → review → done`. The uploaded file (photo or PDF) is sent to the `parseLogImage` Cloud Function, which passes it to Claude as an image or document block and asks for a JSON array of sessions wrapped in `<sessions>` tags. The client parses the tags, matches each supervisor by license number against saved profiles, and presents one card at a time for confirmation. Low-confidence entries are flagged with an amber indicator. Each confirmed session runs through `calcCountedMinutes` before saving, so the same-day cap is respected even when importing multiple sessions for the same date.

## Local Development

```bash
npm install
npm run dev         # http://localhost:5173

# Cloud Function (optional — only needed for log import)
cd functions && npm install
firebase emulators:start
```

## Deployment

```bash
npm run build       # outputs to dist/
# Deploy dist/ to Netlify, Vercel, or Firebase Hosting
firebase deploy --only functions   # redeploy the Cloud Function
```
