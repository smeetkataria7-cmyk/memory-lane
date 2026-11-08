import { describe, expect, it } from 'vitest';
import { ZERO_WEIGHTS, addWeight, removeWeight, type Weights } from '../src/lib/pool';
import { EMOTIONS, POOL_TOTAL } from '../src/theme/tokens';

const total = (w: Weights) => Object.values(w).reduce((s, v) => s + v, 0);
const with_ = (over: Partial<Weights>): Weights => ({ ...ZERO_WEIGHTS, ...over });

describe('addWeight', () => {
  it('grows only the chosen emotion while the pool has room', () => {
    const w = addWeight(ZERO_WEIGHTS, 'joy', 10);
    expect(w.joy).toBe(10);
    expect(total(w)).toBe(10);
  });

  it('takes from the others in proportion once the pool is spent', () => {
    const w = addWeight(with_({ joy: 50, fear: 50 }), 'anger', 10);
    expect(w.anger).toBe(10);
    expect(w.joy).toBeCloseTo(45);
    expect(w.fear).toBeCloseTo(45);
    expect(total(w)).toBeCloseTo(POOL_TOTAL);
  });

  it('takes more from the emotion that has more', () => {
    const w = addWeight(with_({ joy: 75, fear: 25 }), 'anger', 20);
    expect(w.joy).toBeCloseTo(60);
    expect(w.fear).toBeCloseTo(20);
  });

  it('can claim the whole pool', () => {
    const w = addWeight(with_({ joy: 40, fear: 60 }), 'anger', 150);
    expect(w.anger).toBe(POOL_TOTAL);
    expect(w.joy).toBe(0);
    expect(w.fear).toBe(0);
  });

  it('never lets the pool exceed its total, whatever is added', () => {
    let w = ZERO_WEIGHTS;
    let seed = 7;
    const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = 0; i < 2000; i += 1) {
      const key = EMOTIONS[Math.floor(rand() * EMOTIONS.length)].key;
      w = addWeight(w, key, rand() * 6);
      expect(total(w)).toBeLessThanOrEqual(POOL_TOTAL + 1e-9);
      for (const v of Object.values(w)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('does not change the object it was given', () => {
    const before = with_({ joy: 30 });
    const copy = { ...before };
    addWeight(before, 'fear', 5);
    expect(before).toEqual(copy);
  });
});

describe('removeWeight', () => {
  it('lowers one emotion and leaves the rest alone', () => {
    const w = removeWeight(with_({ joy: 30, fear: 20 }), 'joy', 5);
    expect(w.joy).toBe(25);
    expect(w.fear).toBe(20);
  });

  it('never goes below zero', () => {
    expect(removeWeight(with_({ joy: 3 }), 'joy', 5).joy).toBe(0);
    expect(removeWeight(ZERO_WEIGHTS, 'joy', 5).joy).toBe(0);
  });
});
