import { useCallback, useEffect, useRef, useState } from 'react';
import { EMOTIONS, POOL_TOTAL, type EmotionKey } from '../theme/tokens';
import type { EmotionFill } from './blend';

export type Weights = Record<EmotionKey, number>;

const ZERO: Weights = Object.fromEntries(
  EMOTIONS.map((e) => [e.key, 0]),
) as Weights;

const TICK_MS = 50;
const FILL_PER_TICK = 1.4;

// One shared pool: holding an emotion grows it; once the pool is spent,
// continued holding steals proportionally from the others.
export function useEmotionPool(initial?: Partial<Weights>) {
  const [weights, setWeights] = useState<Weights>({ ...ZERO, ...initial });
  const holding = useRef<EmotionKey | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    holding.current = null;
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (key: EmotionKey) => {
      stop();
      holding.current = key;
      timer.current = setInterval(() => {
        setWeights((prev) => {
          const next = { ...prev };
          next[key] = Math.min(POOL_TOTAL, next[key] + FILL_PER_TICK);
          const total = Object.values(next).reduce((s, v) => s + v, 0);
          const overflow = total - POOL_TOTAL;
          if (overflow > 0) {
            const others = EMOTIONS.map((e) => e.key).filter(
              (k) => k !== key && next[k] > 0,
            );
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
        });
      }, TICK_MS);
    },
    [stop],
  );

  const clearOne = useCallback((key: EmotionKey) => {
    setWeights((prev) => ({ ...prev, [key]: 0 }));
  }, []);

  const reset = useCallback(() => setWeights({ ...ZERO }), []);

  const load = useCallback((fills: { emotion: EmotionKey; weight: number }[]) => {
    const w = { ...ZERO };
    for (const f of fills) w[f.emotion] = f.weight;
    setWeights(w);
  }, []);

  useEffect(() => stop, [stop]);

  const fills: EmotionFill[] = EMOTIONS.filter((e) => weights[e.key] > 0).map(
    (e) => ({ emotion: e.key, weight: weights[e.key] }),
  );
  const used = Object.values(weights).reduce((s, v) => s + v, 0);

  return { weights, fills, used, start, stop, clearOne, reset, load };
}
