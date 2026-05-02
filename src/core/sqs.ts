// ─── Stillness Quality Score (SQS) Calculator ────────────────────────────────
// Usage:
//   const sqs = calculateSQS(sessionData, history);
//   endSession(newTotalHours, sessionLen, sqs);

interface SessionData {
  durationMinutes: number;
  uninterruptedMinutes: number;
  stillnessScore: number | null;
  moodBefore: number | null;
  moodAfter: number | null;
  distractionCount: number;
  distractionSeconds: number;
}

interface HistoryData {
  recentSQS?: number[];
  sessionsLast7Days?: number;
  totalHours?: number;
}

/**
 * calculateSQS — produces a single 0–1 score representing session quality.
 *
 * @param session - Data from the just-completed session
 * @param history - Historical context
 * @returns SQS value in [0.25, 1.0], smoothed over recent sessions
 */
export function calculateSQS(session: SessionData, history: HistoryData = {}): number {

  // ── 1. Continuity score (weight 0.35) ──────────────────────────────────────
  // Ratio of uninterrupted time to total time.
  // Penalises distraction proportionally, but applies sqrt to soften harsh penalties.
  // A single brief tap shouldn't devastate a long session.
  const continuityRaw = session.durationMinutes > 0
    ? Math.max(0, Math.min(1, session.uninterruptedMinutes / session.durationMinutes))
    : 0.5;

  // Additional soft penalty per distraction event — each costs up to 0.03
  const distractionPenalty = Math.min(
    (session.distractionCount || 0) * 0.03,
    0.15  // total cap: 5+ distractions max penalty
  );
  let continuityScore = Math.sqrt(continuityRaw) - distractionPenalty;
  continuityScore = Math.max(0, Math.min(1, continuityScore));


  // ── 2. Stillness score (weight 0.25) ───────────────────────────────────────
  // Direct accelerometer variance score when available.
  // Falls back to a tab-focus proxy (continuity) on platforms without sensors.
  let stillnessScore: number;
  if (session.stillnessScore !== null && session.stillnessScore !== undefined) {
    stillnessScore = Math.max(0, Math.min(1, session.stillnessScore));
  } else {
    // Proxy: use continuity as a reasonable stand-in on web without sensors
    stillnessScore = continuityScore;
  }


  // ── 3. Session depth score (weight 0.20) ───────────────────────────────────
  // Log-scaled so short sessions aren't crushed but long ones are rewarded.
  // log(1 + minutes) / log(61) gives:
  //   3 min  → 0.43
  //   5 min  → 0.53
  //   10 min → 0.65
  //   20 min → 0.78
  //   30 min → 0.85
  const depthScore = Math.log(1 + Math.min(session.durationMinutes, 60)) / Math.log(61);


  // ── 4. Mood lift score (weight 0.12) ───────────────────────────────────────
  // Delta between pre and post mood on a 1–5 scale.
  // Normalised to [0, 1] — no change → 0.5, max improvement → 1.0, worsened → 0.
  // If either reading is missing, defaults to neutral (0.5).
  let moodScore = 0.5;
  if (session.moodBefore != null && session.moodAfter != null) {
    const delta = session.moodAfter - session.moodBefore; // range: -4 to +4
    moodScore = (delta + 4) / 8;  // normalise to 0–1
  }


  // ── 5. Consistency bonus (weight 0.08) ─────────────────────────────────────
  // Rewards showing up regularly without punishing gaps.
  // Based on sessions in the last 7 days (0–7 count).
  const sessionsLast7 = history.sessionsLast7Days || 0;
  const consistencyScore = Math.min(sessionsLast7 / 5, 1.0); // 5+ days = full score


  // ── Weighted sum ───────────────────────────────────────────────────────────
  const rawSQS = (
    continuityScore  * 0.35 +
    stillnessScore   * 0.25 +
    depthScore       * 0.20 +
    moodScore        * 0.12 +
    consistencyScore * 0.08
  );


  // ── 3-session smoothing ────────────────────────────────────────────────────
  // Rolling average softens single bad sessions.
  // Weight current session most heavily (0.6), recent history less.
  let smoothed = rawSQS;
  const recent = (history.recentSQS || []).slice(-2); // last 2 previous sessions
  if (recent.length === 1) {
    smoothed = rawSQS * 0.70 + recent[0] * 0.30;
  } else if (recent.length >= 2) {
    smoothed = rawSQS * 0.60 + recent[1] * 0.25 + recent[0] * 0.15;
  }


  // ── Floor clamp ────────────────────────────────────────────────────────────
  // No session ever produces a completely barren tree.
  // 0.25 = deep restful forest greens. Still alive, just quiet.
  return Math.max(0.25, Math.min(1.0, smoothed));
}


// ── Distraction penalty helper (for PWA / native signal processing) ──────────
// Call this during the session to accumulate distraction data.
// Returns an object suitable for passing to calculateSQS.

interface SessionTracker {
  durationMinutes: number;
  uninterruptedMinutes: number;
  distractionCount: number;
  distractionSeconds: number;
  stillnessSamples: number[];
  _currentDistractionStart: number | null;
  onDistracted: (timestampMs: number) => void;
  onReturned: (timestampMs: number) => void;
  onStillnessSample: (varianceNormalized: number) => void;
  getStillnessScore: () => number | null;
  finalise: (moodBefore: number | null, moodAfter: number | null) => SessionData;
}

export function createSessionTracker(durationMinutes: number): SessionTracker {
  const tracker: SessionTracker = {
    durationMinutes,
    uninterruptedMinutes: durationMinutes, // starts optimistic
    distractionCount: 0,
    distractionSeconds: 0,
    stillnessSamples: [],
    _currentDistractionStart: null as number | null,

    // Call when tab loses focus / app goes to background
    onDistracted(timestampMs: number) {
      if (!this._currentDistractionStart) {
        this._currentDistractionStart = timestampMs;
        this.distractionCount++;
      }
    },

    // Call when tab regains focus / app returns to foreground
    onReturned(timestampMs: number) {
      if (this._currentDistractionStart) {
        const secs = (timestampMs - this._currentDistractionStart) / 1000;
        this.distractionSeconds += secs;
        // Subtract distracted minutes from uninterrupted tally
        this.uninterruptedMinutes = Math.max(0,
          this.uninterruptedMinutes - (secs / 60)
        );
        this._currentDistractionStart = null;
      }
    },

    // Call periodically (e.g. every 5s) with accelerometer variance (0=still, 1=moving)
    onStillnessSample(varianceNormalized: number) {
      this.stillnessSamples.push(Math.max(0, Math.min(1, varianceNormalized)));
    },

    // Compute final stillness score (inverted — low variance = high score)
    getStillnessScore() {
      if (this.stillnessSamples.length === 0) return null;
      const avgVariance = this.stillnessSamples.reduce((a, b) => a + b, 0)
        / this.stillnessSamples.length;
      return 1 - avgVariance;
    },

    // Finalise — call at session end before passing to calculateSQS
    finalise(moodBefore: number | null, moodAfter: number | null): SessionData {
      return {
        durationMinutes:      this.durationMinutes,
        uninterruptedMinutes: this.uninterruptedMinutes,
        stillnessScore:       this.getStillnessScore(),
        moodBefore,
        moodAfter,
        distractionCount:     this.distractionCount,
        distractionSeconds:   this.distractionSeconds,
      };
    }
  };
  return tracker;
}