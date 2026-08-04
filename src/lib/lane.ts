import type { Ball } from './balls';

export type LaneCell = {
  day: string;
  dayOfMonth: number;
  ball: Ball | null;
  // Days that haven't happened yet still get a socket, so a month reads as
  // a full shelf with room left on it rather than a row that stops midway.
  future: boolean;
};

export type LaneMonth = {
  key: string; // YYYY-MM
  cells: LaneCell[];
};

const pad = (n: number) => String(n).padStart(2, '0');

// Whole calendar months, from the month of the first entry through the
// current one. Every day gets a cell - missed days stay visible as blanks
// instead of quietly collapsing, and a month is always a complete shelf.
export function buildLane(balls: Ball[]): LaneMonth[] {
  if (balls.length === 0) return [];
  const byDay = new Map(balls.map((b) => [b.day, b]));
  const days = balls.map((b) => b.day).sort();
  const first = new Date(`${days[0]}T00:00:00`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const months: LaneMonth[] = [];
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth(), 1);

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const key = `${year}-${pad(month + 1)}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: LaneCell[] = [];
    for (let dom = 1; dom <= daysInMonth; dom += 1) {
      const day = `${key}-${pad(dom)}`;
      cells.push({
        day,
        dayOfMonth: dom,
        ball: byDay.get(day) ?? null,
        future: day > todayKey,
      });
    }
    months.push({ key, cells });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months.reverse();
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
