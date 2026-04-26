export type Screen =
  | 'landing'
  | 'auth'
  | 'naming'
  | 'sanctuary'
  | 'pre_session'
  | 'breathing'
  | 'closing'
  | 'session_result';

export interface Distraction {
  count: number;
  seconds: number;
  stillness: number;
  uninterruptedMins: number;
}

/** Partial distraction update emitted by the Breathing screen via onSignal */
export interface DistractionSignal {
  distractionCount?: number;
  distractionSeconds?: number;
  stillnessScore?: number;
  uninterruptedMinutes?: number;
}

export interface ActiveSession {
  id: string;
  treeId: string;
  moodBefore: number;
  distraction: Distraction;
}

export interface SessionResultData {
  sqs: number;
  durationMinutes: number;
  totalHours: number;
  prevTotalHours: number;
  moodBefore: number | null;
  moodAfter: number;
  treeName: string;
  treeId: string | null;
}
