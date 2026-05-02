# StillGrove

Stillgrove is a React + TypeScript SPA that visualizes meditation/focus session quality as a procedurally-generated growing tree. Bundled with Vite, hosted on Firebase, backend on Firestore

## Development

Deploy via Firebase: `firebase deploy` (project: `still-grove`).

### Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Architecture

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
                                     milestone(s)   (one per crossed stage boundary, if any)
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

### Canvas 2D / sketch integration

`sketch.ts` exports a `CanvasTreeSketch` class that wraps an HTML `<canvas>` element and runs its own `requestAnimationFrame` draw loop outside React. React props flow in via instance methods:

- `setTotalHours(h)` / `setSQS(s)` — called from `TreeSketch` props on every render; triggers tree regeneration when the stage changes
- `triggerEndSession(newHours)` — sets growth target, spawns burst particles, starts animation
- `replayGrowthAnimation(fromHours)` — resets `growthProgress` to a prior baseline and re-starts animation; used by `SessionResult` after a fresh canvas mount

`TreeSketch.tsx` clears the container (`innerHTML = ''`) before instantiating a new `CanvasTreeSketch` to avoid React StrictMode double-mount leaving two canvases.

Canvas 2D bezier curves use the standard `ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey)` 6-arg form. The helper `cubicBezierTo(ctx, cp1x, cp1y, cp2x, cp2y, ex, ey)` wraps this for readability.

#### Tree generation

The tree is built once per stage via seeded recursive branching (`mulberry32` PRNG). `generateStableBranch` produces a stable `Branch[]` topology from the seed; `growthProgress` (mapped from `totalHours` via a square-root curve) controls which depth levels are revealed during rendering. `treeMaxDepth` and per-stage branching probabilities (`stageEarlyP0/P01`, `stageMatureP0/P01`, `stageLenLow/High`) increase across the 5 stages to add density over time. When `setTotalHours` detects a stage change, it calls `regenerateTree` to rebuild with the new params — always resetting the PRNG to `treeSeedNum` first so topology is deterministic.

### Firebase / data model

- **`trees/{treeId}`** — `{ userId, name, totalHours, sqs, hasBloomed, groveId, createdAt }`
- **`trees/{treeId}/sessions/{sessionId}`** — `{ moodBefore, moodAfter, durationMinutes, uninterruptedMinutes, stillnessScore, distractionCount, distractionSeconds, sqs, createdAt }`

`useTrees(user)` subscribes to the user's trees via `onSnapshot`. `useTree(treeId)` subscribes to a single tree. `useAuth()` wraps `onAuthStateChanged`.

### Distraction tracking

`Breathing.tsx` tracks mouse/touch/keyboard activity via event listeners and reports via `onSignal` prop. `App.tsx` accumulates these in `distractionDataRef` (a ref, not state, to avoid re-renders) and uses them in `handleFinishSession` to populate the SQS inputs.

### Firebase hosting

`firebase.json` serves `dist/` with SPA rewrites (`/* → /index.html`). GitHub Actions handle deploy on merge and PR previews.
