import { describe, expect, it } from 'vitest';
import { STAGES, nextStage, stageFor, treeLayout } from '../src/lib/treeGeometry';

describe('stageFor', () => {
  it.each([
    [0, 0, 'Seed'],
    [1, 1, 'Sprout'],
    [6, 1, 'Sprout'],
    [7, 2, 'Sapling'],
    [29, 2, 'Sapling'],
    [30, 3, 'Young tree'],
    [89, 3, 'Young tree'],
    [90, 4, 'Full tree'],
    [10_000, 4, 'Full tree'],
  ])('a %i-day streak is stage %i (%s)', (streak, index, name) => {
    const result = stageFor(streak);
    expect(result.index).toBe(index);
    expect(result.stage.name).toBe(name);
  });
});

describe('nextStage', () => {
  it('points at the stage after the current one', () => {
    expect(nextStage(0)?.name).toBe('Sprout');
    expect(nextStage(7)?.name).toBe('Young tree');
  });

  it('is null once the tree is fully grown', () => {
    expect(nextStage(90)).toBeNull();
  });

  it('is always strictly further than the current streak', () => {
    for (let s = 0; s < 120; s += 1) {
      const n = nextStage(s);
      if (n) expect(n.minDays).toBeGreaterThan(s);
    }
  });
});

describe('treeLayout', () => {
  const colors = ['#e8b923', '#4c6fe7', '#de4a30'];

  it('draws more leaves as the streak grows', () => {
    const counts = STAGES.map((s) => treeLayout(s.minDays, colors, '#999999').leaves.length);
    expect(counts).toEqual([0, 3, 8, 14, 22]);
  });

  it('is deterministic: the same streak draws the same tree', () => {
    expect(treeLayout(45, colors, '#999999')).toEqual(treeLayout(45, colors, '#999999'));
  });

  it('cycles through the supplied colours', () => {
    const { leaves } = treeLayout(10, colors, '#999999');
    expect(leaves.map((l) => l.fill)).toEqual(
      leaves.map((_, k) => colors[k % colors.length]),
    );
  });

  it('uses the fallback colour when there are no real days yet', () => {
    const { leaves } = treeLayout(10, [], '#abcdef');
    expect(leaves.length).toBeGreaterThan(0);
    expect(new Set(leaves.map((l) => l.fill))).toEqual(new Set(['#abcdef']));
  });

  it('keeps every leaf inside the 100x100 viewBox at every stage', () => {
    for (const s of STAGES) {
      for (const leaf of treeLayout(s.minDays, colors, '#999999').leaves) {
        expect(leaf.cx).toBeGreaterThanOrEqual(0);
        expect(leaf.cx).toBeLessThanOrEqual(100);
        expect(leaf.cy).toBeGreaterThanOrEqual(0);
        expect(leaf.cy).toBeLessThanOrEqual(100);
      }
    }
  });

  it('adds branches from the sapling stage and a thicker trunk from the young tree', () => {
    expect(treeLayout(1, colors, '#999999').branches).toBe(false);
    expect(treeLayout(7, colors, '#999999').branches).toBe(true);
    expect(treeLayout(7, colors, '#999999').strokeWidth).toBe(3);
    expect(treeLayout(30, colors, '#999999').strokeWidth).toBe(5);
  });

  it('reports the stage name that matches the streak', () => {
    expect(treeLayout(0, colors, '#999999').stageName).toBe('Seed');
    expect(treeLayout(95, colors, '#999999').stageName).toBe('Full tree');
  });
});
