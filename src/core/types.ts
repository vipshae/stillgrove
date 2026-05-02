import type { TreeStage } from './stages';

export type Screen =
  | 'landing'
  | 'auth'
  | 'naming'
  | 'sanctuary'
  | 'pre_session'
  | 'breathing'
  | 'closing'
  | 'milestone'
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
  // Hours to replay the growth animation from. Equal to prevTotalHours for
  // same-stage sessions; equal to the new stage's minHours when a stage boundary
  // was crossed (so the animation starts from the stage entry state).
  replayFromHours: number;
  moodBefore: number | null;
  moodAfter: number;
  treeName: string;
  treeId: string | null;
  crossedStages: TreeStage[];
}

export interface MilestoneData {
  stage: TreeStage;
  treeName: string;
}
