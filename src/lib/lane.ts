import type { Ball } from './balls';

export type LaneCell = {
  day: string;
  dayOfMonth: number;
  ball: Ball | null;
};

export type LaneMonth = {
  key: string; // YYYY-MM
  cells: LaneCell[];
};

const pad = (n: number) => String(n).padStart(2, '0');

// Every day from the first entry to today gets a cell, so missed days
// stay visible as blanks instead of quietly collapsing.
export function buildLane(balls: Ball[]): LaneMonth[] {
  if (balls.length === 0) return [];
  const byDay = new Map(balls.map((b) => [b.day, b]));
  const days = balls.map((b) => b.day).sort();
  const first = new Date(`${days[0]}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const months = new Map<string, LaneCell[]>();
  for (const d = new Date(first); d <= today; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const day = `${key}-${pad(d.getDate())}`;
    if (!months.has(key)) months.set(key, []);
    months.get(key)!.push({
      day,
      dayOfMonth: d.getDate(),
      ball: byDay.get(day) ?? null,
    });
  }

  return [...months.entries()]
    .map(([key, cells]) => ({ key, cells }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const now = new Date();
  const sameYear = y === now.getFullYear();
  return sameYear ? MONTH_NAMES[m - 1] : `${MONTH_NAMES[m - 1]} ${y}`;
}

export function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Consecutive days ending today (or yesterday, if today isn't filled yet).
export function currentStreak(balls: Ball[]): number {
  if (balls.length === 0) return 0;
  const filled = new Set(balls.map((b) => b.day));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const key = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (!filled.has(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!filled.has(key(cursor))) return 0;
  }
  let streak = 0;
  while (filled.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
