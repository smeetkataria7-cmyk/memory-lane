import { EMOTIONS, POOL_TOTAL, type EmotionKey } from '../theme/tokens';

export type Weights = Record<EmotionKey, number>;

export const ZERO_WEIGHTS: Weights = Object.fromEntries(
  EMOTIONS.map((e) => [e.key, 0]),
) as Weights;

/**
 * Add `amount` to one emotion in the shared pool. The pool only holds
 * POOL_TOTAL, so once it is spent, whatever is added is taken from the other
 * emotions in proportion to how much each has. Returns a new object.
 */
export function addWeight(prev: Weights, key: EmotionKey, amount: number): Weights {
  const next = { ...prev };
  next[key] = Math.min(POOL_TOTAL, next[key] + amount);
  const total = Object.values(next).reduce((s, v) => s + v, 0);
  const overflow = total - POOL_TOTAL;
  if (overflow > 0) {
    const others = EMOTIONS.map((e) => e.key).filter((k) => k !== key && next[k] > 0);
    const otherTotal = others.reduce((s, k) => s + next[k], 0);
    if (otherTotal <= overflow) {
      for (const k of others) next[k] = 0;
      next[key] = POOL_TOTAL;
    } else {
      for (const k of others) {
        next[k] = Math.max(0, next[k] - (overflow * next[k]) / otherTotal);
      }
    }
  }
  return next;
}

/** Take `amount` back out of one emotion, never going below zero. */
export function removeWeight(prev: Weights, key: EmotionKey, amount: number): Weights {
  return { ...prev, [key]: Math.max(0, prev[key] - amount) };
}
