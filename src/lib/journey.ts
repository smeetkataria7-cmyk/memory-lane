import type { EmotionFill } from './blend';

// A day earns a place in Journey two different ways.
export const INTENSITY_THRESHOLD = 70; // one emotion dominating hard
export const DIVERSITY_MIN_WEIGHT = 5; // what counts as "present at all"
export const DIVERSITY_COUNT = 5; // this many present at once = a lot happened

export type JourneyReason = 'intensity' | 'diversity' | 'manual';

export function detectJourney(fills: EmotionFill[]): JourneyReason | null {
  if (fills.some((f) => f.weight >= INTENSITY_THRESHOLD)) return 'intensity';
  const present = fills.filter((f) => f.weight >= DIVERSITY_MIN_WEIGHT);
  if (present.length >= DIVERSITY_COUNT) return 'diversity';
  return null;
}

export const journeyReasonLabel: Record<JourneyReason, string> = {
  intensity: 'One feeling ran the day',
  diversity: 'A lot happened',
  manual: 'You kept this one',
};
