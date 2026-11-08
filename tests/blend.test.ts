import { describe, expect, it } from 'vitest';
import { blendEmotions, darken, dominantEmotion, lighten } from '../src/lib/blend';
import { EMOTIONS, emotionColor } from '../src/theme/tokens';

const hex = /^#[0-9a-f]{6}$/;

describe('blendEmotions', () => {
  it('falls back to the neutral colour when nothing is filled', () => {
    expect(blendEmotions([])).toBe('#8583a3');
    expect(blendEmotions([{ emotion: 'joy', weight: 0 }])).toBe('#8583a3');
  });

  it('returns an emotion\'s own colour when it is the only one present', () => {
    for (const e of EMOTIONS) {
      expect(blendEmotions([{ emotion: e.key, weight: 40 }])).toBe(e.color);
    }
  });

  it('ignores zero-weight emotions', () => {
    expect(
      blendEmotions([
        { emotion: 'joy', weight: 30 },
        { emotion: 'anger', weight: 0 },
      ]),
    ).toBe(emotionColor('joy'));
  });

  it('depends on the proportions, not the absolute weights', () => {
    const small = blendEmotions([
      { emotion: 'joy', weight: 1 },
      { emotion: 'sadness', weight: 3 },
    ]);
    const large = blendEmotions([
      { emotion: 'joy', weight: 25 },
      { emotion: 'sadness', weight: 75 },
    ]);
    expect(small).toBe(large);
  });

  it('does not depend on the order of the fills', () => {
    const a = blendEmotions([
      { emotion: 'joy', weight: 30 },
      { emotion: 'fear', weight: 70 },
    ]);
    const b = blendEmotions([
      { emotion: 'fear', weight: 70 },
      { emotion: 'joy', weight: 30 },
    ]);
    expect(a).toBe(b);
  });

  it('always produces a valid hex colour, including for mixes', () => {
    const mix = blendEmotions(EMOTIONS.map((e) => ({ emotion: e.key, weight: 11 })));
    expect(mix).toMatch(hex);
  });

  it('moves toward the heavier emotion', () => {
    const channel = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    const mostlyBlue = blendEmotions([
      { emotion: 'sadness', weight: 90 },
      { emotion: 'anger', weight: 10 },
    ]);
    // sadness is blue-ish (#4c6fe7), anger is red-ish (#de4a30)
    expect(channel(mostlyBlue, 2)).toBeGreaterThan(channel(mostlyBlue, 0));
  });
});

describe('dominantEmotion', () => {
  it('returns null when nothing is filled', () => {
    expect(dominantEmotion([])).toBeNull();
    expect(dominantEmotion([{ emotion: 'joy', weight: 0 }])).toBeNull();
  });

  it('picks the heaviest emotion', () => {
    expect(
      dominantEmotion([
        { emotion: 'joy', weight: 20 },
        { emotion: 'envy', weight: 55 },
        { emotion: 'fear', weight: 25 },
      ])?.emotion,
    ).toBe('envy');
  });

  it('keeps the first one when two are tied', () => {
    expect(
      dominantEmotion([
        { emotion: 'joy', weight: 50 },
        { emotion: 'fear', weight: 50 },
      ])?.emotion,
    ).toBe('joy');
  });
});

describe('lighten and darken', () => {
  it('are no-ops at amount 0', () => {
    expect(lighten('#4c6fe7', 0)).toBe('#4c6fe7');
    expect(darken('#4c6fe7', 0)).toBe('#4c6fe7');
  });

  it('reach white and black at amount 1', () => {
    expect(lighten('#4c6fe7', 1)).toBe('#ffffff');
    expect(darken('#4c6fe7', 1)).toBe('#000000');
  });

  it('keep the result a valid hex colour', () => {
    expect(lighten('#de4a30', 0.37)).toMatch(hex);
    expect(darken('#de4a30', 0.37)).toMatch(hex);
  });
});
