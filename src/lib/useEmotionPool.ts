import { useCallback, useEffect, useRef, useState } from 'react';
import { EMOTIONS, type EmotionKey } from '../theme/tokens';
import type { EmotionFill } from './blend';
import { ZERO_WEIGHTS as ZERO, addWeight, removeWeight, type Weights } from './pool';

export type { Weights } from './pool';

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
        setWeights((prev) => addWeight(prev, key, FILL_PER_TICK));
      }, TICK_MS);
    },
    [stop],
  );

  // For anyone who can't hold a finger down (screen readers, switch access):
  // one step up or down, taken from or given back to the same shared pool.
  const nudge = useCallback((key: EmotionKey, delta: number) => {
    setWeights((prev) => (delta >= 0 ? addWeight(prev, key, delta) : removeWeight(prev, key, -delta)));
  }, []);

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

  return { weights, fills, used, start, stop, nudge, clearOne, reset, load };
}
