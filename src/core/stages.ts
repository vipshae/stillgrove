export interface TreeStage {
  index: number;
  label: string;
  description: string;
  minHours: number;
  maxHours: number;
}

export const STAGES: TreeStage[] = [
  { index: 0, label: 'Seedling',   description: 'A tender beginning.',  minHours: 0,  maxHours: 3        },
  { index: 1, label: 'Sapling',    description: 'Taking root.',         minHours: 3,  maxHours: 10       },
  { index: 2, label: 'Young Tree', description: 'Growing upward.',      minHours: 10, maxHours: 30       },
  { index: 3, label: 'Elder Tree', description: 'Deep and enduring.',   minHours: 30, maxHours: 50       },
  { index: 4, label: 'Elder',      description: 'An ancient presence.', minHours: 50, maxHours: Infinity },
];

export function getStage(hours: number): TreeStage {
  return STAGES.find(s => hours < s.maxHours) ?? STAGES[STAGES.length - 1];
}

// Returns each stage boundary crossed when going from prevHours → newHours.
// E.g. 9 → 12 hrs returns [Sapling→YoungTree], 2 → 35 hrs returns [Sapling, YoungTree, ElderTree].
export function getCrossedStages(prevHours: number, newHours: number): TreeStage[] {
  const startIdx = getStage(prevHours).index;
  const endIdx   = getStage(newHours).index;
  return STAGES.slice(startIdx + 1, endIdx + 1);
}
