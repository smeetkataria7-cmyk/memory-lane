import { describe, expect, it } from 'vitest';
import { todayKey } from '../src/lib/dates';

describe('todayKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 7, 4, 12, 0))).toBe('2026-08-04');
  });

  it('uses the local calendar date, not the UTC one', () => {
    // Constructed in local time, so this is just after midnight wherever
    // the tests run. A UTC-based key would give the previous day in any
    // timezone east of UTC.
    expect(todayKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
  });

  it('keeps late-evening entries on the same day', () => {
    // And just before midnight, a UTC-based key would roll to the next day
    // in any timezone west of UTC.
    expect(todayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('pads single-digit months and days', () => {
    expect(todayKey(new Date(2026, 2, 5, 9, 0))).toBe('2026-03-05');
  });

  it('defaults to today', () => {
    expect(todayKey()).toBe(todayKey(new Date()));
  });
});
