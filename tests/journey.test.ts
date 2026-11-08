import { describe, expect, it } from 'vitest';
import {
  DIVERSITY_COUNT,
  DIVERSITY_MIN_WEIGHT,
  INTENSITY_THRESHOLD,
  detectJourney,
  journeyReasonLabel,
} from '../src/lib/journey';
import type { EmotionFill } from '../src/lib/blend';
import { EMOTIONS } from '../src/theme/tokens';

const spread = (count: number, weight: number): EmotionFill[] =>
  EMOTIONS.slice(0, count).map((e) => ({ emotion: e.key, weight }));

describe('detectJourney', () => {
  it('returns null for an empty day', () => {
    expect(detectJourney([])).toBeNull();
  });

  it('flags a day where one emotion dominates', () => {
    expect(detectJourney([{ emotion: 'joy', weight: INTENSITY_THRESHOLD }])).toBe('intensity');
    expect(detectJourney([{ emotion: 'joy', weight: 100 }])).toBe('intensity');
  });

  it('does not flag an emotion just under the intensity threshold', () => {
    expect(
      detectJourney([
        { emotion: 'joy', weight: INTENSITY_THRESHOLD - 1 },
        { emotion: 'fear', weight: 31 - 1 },
      ]),
    ).toBeNull();
  });

  it('flags a day where many emotions were present', () => {
    expect(detectJourney(spread(DIVERSITY_COUNT, DIVERSITY_MIN_WEIGHT))).toBe('diversity');
    expect(detectJourney(spread(9, 11))).toBe('diversity');
  });

  it('needs enough emotions to be present', () => {
    expect(detectJourney(spread(DIVERSITY_COUNT - 1, 20))).toBeNull();
  });

  it('does not count emotions below the minimum weight as present', () => {
    const fills = spread(DIVERSITY_COUNT, DIVERSITY_MIN_WEIGHT);
    fills[0] = { ...fills[0], weight: DIVERSITY_MIN_WEIGHT - 1 };
    expect(detectJourney(fills)).toBeNull();
  });

  it('prefers intensity when a day qualifies for both', () => {
    const fills = spread(DIVERSITY_COUNT, DIVERSITY_MIN_WEIGHT);
    fills[0] = { ...fills[0], weight: 75 };
    expect(detectJourney(fills)).toBe('intensity');
  });
});

describe('journeyReasonLabel', () => {
  it('has a label for every reason', () => {
    expect(Object.keys(journeyReasonLabel).sort()).toEqual(['diversity', 'intensity', 'manual']);
    for (const label of Object.values(journeyReasonLabel)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
