# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test framework is configured.

Deploy via Firebase: `firebase deploy` (project: `still-grove`).

## Architecture

Stillgrove is a React + TypeScript SPA that visualizes meditation/focus session quality as a procedurally-generated growing tree. Bundled with Vite, hosted on Firebase, backend on Firestore.

### Screen flow

```
landing → auth → naming (first time) → sanctuary
                                           ↓
                                       pre_session  (record mood before)
                                           ↓
                                        breathing   (live session: timer, distraction tracking)
                                           ↓
                                         closing    (record mood after)
                                           ↓
                                      session_result (animated tree growth + stats)
                                           ↓
                                        sanctuary   (updated stats)
```

`App.tsx` owns all navigation state (`currentScreen`, `history[]`) and drives the full session lifecycle via `handleStartSession` → `handleFinishSession`.

### Session data flow

```
PreSession (moodBefore)
    ↓  handleStartSession → Firestore session doc created, per-minute timer starts
Breathing (distractionDataRef accumulates onSignal updates)
    ↓  onEndSession → navigate to closing
Closing (moodAfter)
    ↓  handleFinishSession:
         1. stopTimer, finalise durationMinutes in Firestore
         2. calculateSQS(sessionObj, history) → newSqs
         3. updateTree(totalHours, sqs) in Firestore
         4. triggerEndSession(newTotalHours) → sketch animation globals
         5. setSessionResult(...) → navigate('session_result')
SessionResult
    ↓  useEffect → replayGrowthAnimation(prevTotalHours) so tree animates on mount
    ↓  onNavigate('sanctuary')
Sanctuary (reflects updated tree from Firestore via onSnapshot)
```

### p5.js / sketch integration

`sketch.ts` uses **module-level globals** (`TotalHours`, `SQS`, `growthProgress`, `isAnimating`, etc.) because p5 manages its own draw loop outside React. React props flow in via setter exports:

- `setTotalHours(h)` / `setSQS(s)` — synced from `TreeSketch` props on every render
- `triggerEndSession(newHours, sessionHours)` — sets growth target, spawns burst particles, starts animation
- `replayGrowthAnimation(prevHours)` — resets `growthProgress` to old baseline and re-starts animation; used by `SessionResult` after a fresh p5 mount

`TreeSketch.tsx` clears the container (`innerHTML = ''`) before creating a new p5 instance to avoid React StrictMode double-mount leaving two canvases.

p5 v2 uses `bezierVertex(x, y)` per control/anchor point (one call per point, 3 calls per cubic segment) — different from p5 v1's 6-arg single call. The helper `cubicBezierTo(p, cp1x, cp1y, cp2x, cp2y, ex, ey)` wraps this.

### Firebase / data model

- **`trees/{treeId}`** — `{ userId, name, totalHours, sqs, hasBloomed, groveId, createdAt }`
- **`trees/{treeId}/sessions/{sessionId}`** — `{ moodBefore, moodAfter, durationMinutes, uninterruptedMinutes, stillnessScore, distractionCount, distractionSeconds, sqs, createdAt }`

`useTrees(user)` subscribes to the user's trees via `onSnapshot`. `useTree(treeId)` subscribes to a single tree. `useAuth()` wraps `onAuthStateChanged`.

### Distraction tracking

`Breathing.tsx` tracks mouse/touch/keyboard activity via event listeners and reports via `onSignal` prop. `App.tsx` accumulates these in `distractionDataRef` (a ref, not state, to avoid re-renders) and uses them in `handleFinishSession` to populate the SQS inputs.

### Key files

| File | Role |
|------|------|
| `src/App.tsx` | Navigation state machine, session lifecycle handlers |
| `src/core/sketch.ts` | p5.js tree renderer, module-level globals, animation exports |
| `src/core/sqs.ts` | Session Quality Score pure function |
| `src/components/TreeSketch.tsx` | p5 React wrapper |
| `src/components/screens/` | One file per screen |
| `src/hooks/useTrees.ts` | Firestore trees |
| `src/hooks/useAuth.ts` | Firebase auth state |
| `src/hooks/useSession.ts` | Session Management CRUD |

### Firebase hosting

`firebase.json` serves `dist/` with SPA rewrites (`/* → /index.html`). GitHub Actions handle deploy on merge and PR previews.
