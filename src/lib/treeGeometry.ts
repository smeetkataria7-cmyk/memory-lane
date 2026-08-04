// Shared geometry for the memory tree.
//
// The tree is drawn twice: with react-native-svg components in the app, and
// as an SVG string in the home screen widget. Both read their numbers from
// here so the widget can never quietly drift from the real thing.

export type PlantStage = {
  name: string;
  minDays: number;
};

export const STAGES: PlantStage[] = [
  { name: 'Seed', minDays: 0 },
  { name: 'Sprout', minDays: 1 },
  { name: 'Sapling', minDays: 7 },
  { name: 'Young tree', minDays: 30 },
  { name: 'Full tree', minDays: 90 },
];

export function stageFor(streak: number): { index: number; stage: PlantStage } {
  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (streak >= STAGES[i].minDays) index = i;
  }
  return { index, stage: STAGES[index] };
}

export function nextStage(streak: number): PlantStage | null {
  return STAGES.find((s) => s.minDays > streak) ?? null;
}

// Sized so the tallest stage still fits inside the 100x100 viewBox.
const STEM = [0, 14, 24, 32, 38];
const CANOPY = [0, 8, 15, 21, 26];
const LEAVES = [0, 3, 8, 14, 22];
const LEAF_R = [0, 4, 4.2, 4.4, 4.6];

export const BASE_Y = 88;

// Leaves land on a phyllotactic spiral - the same 137.5° step real plants
// use - so the canopy fills evenly and never looks like a grid. The angle
// comes from the index, so a given streak always draws the same tree.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export type Leaf = { cx: number; cy: number; fill: string };

export type TreeLayout = {
  index: number;
  stageName: string;
  stem: number;
  leafR: number;
  strokeWidth: number;
  branches: boolean;
  leaves: Leaf[];
};

export function treeLayout(
  streak: number,
  colors: string[],
  fallbackColor: string,
): TreeLayout {
  const { index } = stageFor(streak);
  const canopyR = CANOPY[index];
  const leafCount = LEAVES[index];
  const canopyCy = BASE_Y - STEM[index] - canopyR * 0.35;

  const leaves: Leaf[] = Array.from({ length: leafCount }, (_, k) => {
    const angle = k * GOLDEN_ANGLE;
    const r = canopyR * Math.sqrt((k + 0.5) / Math.max(leafCount, 1));
    return {
      cx: 50 + r * Math.cos(angle),
      // Squashed vertically so the canopy reads as a crown, not a ball.
      cy: canopyCy + r * Math.sin(angle) * 0.82,
      fill: colors.length > 0 ? colors[k % colors.length] : fallbackColor,
    };
  });

  return {
    index,
    stageName: STAGES[index].name,
    stem: STEM[index],
    leafR: LEAF_R[index],
    strokeWidth: index >= 3 ? 5 : 3,
    branches: index >= 2,
    leaves,
  };
}
