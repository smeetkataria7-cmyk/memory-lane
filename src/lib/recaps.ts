import type { Ball } from './balls';
import { EMOTIONS, type EmotionKey } from '../theme/tokens';

export type Flashback = {
  ball: Ball;
  label: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

// "A year ago today" / "6 months ago" - same calendar day, earlier.
export function onThisDay(balls: Ball[], now = new Date()): Flashback[] {
  const out: Flashback[] = [];
  const byDay = new Map(balls.map((b) => [b.day, b]));

  for (const yearsBack of [1, 2, 3, 4, 5]) {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - yearsBack);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const ball = byDay.get(key);
    if (ball) {
      out.push({
        ball,
        label: yearsBack === 1 ? 'A year ago today' : `${yearsBack} years ago today`,
      });
    }
  }

  for (const monthsBack of [1, 3, 6]) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - monthsBack);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const ball = byDay.get(key);
    if (ball) {
      out.push({
        ball,
        label: monthsBack === 1 ? 'A month ago today' : `${monthsBack} months ago today`,
      });
    }
  }

  return out;
}

// A Journey day resurfacing on its own. Seeded by date so the same
// day always resurfaces the same memory rather than reshuffling
// every time the screen is opened.
export function resurfaced(journeyBalls: Ball[], now = new Date()): Ball | null {
  if (journeyBalls.length === 0) return null;
  const seed = Number(
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
  );
  return journeyBalls[seed % journeyBalls.length];
}

export type MonthMoments = {
  key: string;
  daysFilled: number;
  totalDays: number;
  dominant: { emotion: EmotionKey; label: string; color: string; share: number } | null;
  spread: { emotion: EmotionKey; label: string; color: string; share: number }[];
  journeyDays: Ball[];
  heaviest: Ball | null;
  lightest: Ball | null;
};

const HEAVY: EmotionKey[] = ['sadness', 'anger', 'fear', 'anxiety', 'embarrassment'];

function weightOf(ball: Ball, keys: EmotionKey[]): number {
  return ball.fills
    .filter((f) => keys.includes(f.emotion))
    .reduce((s, f) => s + f.weight, 0);
}

export function monthMoments(balls: Ball[], monthKey: string): MonthMoments {
  const inMonth = balls.filter((b) => b.day.startsWith(monthKey));
  const [y, m] = monthKey.split('-').map(Number);
  const totalDays = new Date(y, m, 0).getDate();

  const totals = new Map<EmotionKey, number>();
  for (const b of inMonth) {
    for (const f of b.fills) {
      totals.set(f.emotion, (totals.get(f.emotion) ?? 0) + f.weight);
    }
  }
  const grand = [...totals.values()].reduce((s, v) => s + v, 0);

  const spread = [...totals.entries()]
    .map(([emotion, weight]) => {
      const meta = EMOTIONS.find((e) => e.key === emotion)!;
      return {
        emotion,
        label: meta.label,
        color: meta.color,
        share: grand > 0 ? (weight / grand) * 100 : 0,
      };
    })
    .sort((a, b) => b.share - a.share);

  const withHeavy = inMonth.map((b) => ({ b, heavy: weightOf(b, HEAVY) }));
  const sortedHeavy = [...withHeavy].sort((x, y2) => y2.heavy - x.heavy);

  return {
    key: monthKey,
    daysFilled: inMonth.length,
    totalDays,
    dominant: spread[0] ?? null,
    spread: spread.slice(0, 5),
    journeyDays: inMonth.filter((b) => b.journey),
    heaviest: sortedHeavy[0]?.b ?? null,
    lightest: sortedHeavy[sortedHeavy.length - 1]?.b ?? null,
  };
}

export function availableMonths(balls: Ball[]): string[] {
  return [...new Set(balls.map((b) => b.day.slice(0, 7)))].sort((a, b) =>
    b.localeCompare(a),
  );
}
