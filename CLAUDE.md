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

Stillgrove is a React + TypeScript SPA that visualizes meditation/focus session quality as a procedurally-generated growing tree. Bundled with Vite, hosted on Firebase.

### Data flow

```
App.tsx  →  TreeSketch.tsx  →  sketch.ts (p5.js)
  ↓
sqs.ts (pure function)
```

- **`App.tsx`** holds `totalHours` and `sqs` state. On "End Session", it calls `calculateSQS()` and passes updated props to `TreeSketch`.
- **`TreeSketch.tsx`** mounts a p5 instance imperatively (`new p5(sketch, ref)`), syncs incoming props to global state in `sketch.ts` via `setTotalHours()` / `setSQS()`.
- **`sketch.ts`** is the p5.js rendering engine. It uses module-level globals (`TotalHours`, `SQS`, `growthProgress`, etc.) rather than React state. Exports `setTotalHours()`, `setSQS()`, and `triggerEndSession()`.
- **`sqs.ts`** calculates a Session Quality Score (0.25–1.0) as a pure function from session data + history. Weighted factors: continuity (35%), stillness (25%), session depth (20%), mood lift (12%), consistency (8%).

### p5.js integration pattern

Because p5.js manages its own draw loop, state is shared via module-level globals in `sketch.ts`. React props flow into the sketch through setter functions — not through re-renders or React context.

### Legacy files

`src/sketch.js`, `src/sqs.js`, and `src/index.html` are old JavaScript versions kept for reference. The active source is the `.ts` versions.

### Firebase hosting

`firebase.json` serves the `dist/` directory with SPA rewrites (`/* → /index.html`). GitHub Actions handle deploy on merge and PR previews.
