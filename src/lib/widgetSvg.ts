// SVG as strings, for the home screen widgets.
//
// Widgets render through Android's RemoteViews, which cannot host React
// Native components - so the orb and the tree are emitted as plain SVG
// markup here rather than reusing the on-screen components. The geometry
// still comes from the same modules, so the shapes stay in step.

import { blendEmotions, darken, lighten, type EmotionFill } from './blend';
import { BASE_Y, treeLayout } from './treeGeometry';

const n = (v: number) => Math.round(v * 100) / 100;

// A lit sphere. Simpler than the in-app orb - no per-emotion colour dabs,
// because at widget size they are not legible and every extra gradient is
// another thing the platform SVG renderer has to agree with us about.
export function orbSvg(opts: {
  fills?: EmotionFill[];
  color?: string;
  glowBehind?: boolean;
}): string {
  const base = opts.color ?? blendEmotions(opts.fills ?? []);
  const light = lighten(base, 0.35);
  const dark = darken(base, 0.28);
  const halo = opts.glowBehind
    ? `<circle cx="75" cy="75" r="72" fill="url(#halo)"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
  <defs>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${light}" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="${base}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${base}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="body" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="55%" stop-color="${base}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </radialGradient>
    <radialGradient id="top" cx="30%" cy="22%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${halo}
  <circle cx="75" cy="75" r="50" fill="url(#body)"/>
  <circle cx="75" cy="75" r="50" fill="url(#top)"/>
  <ellipse cx="58" cy="49" rx="10" ry="5" fill="#ffffff" opacity="0.5" transform="rotate(-28 58 49)"/>
</svg>`;
}

// An empty socket, for a day not filled in yet.
export function emptyOrbSvg(stroke: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
  <circle cx="75" cy="75" r="46" fill="none" stroke="${stroke}" stroke-width="3" stroke-dasharray="7 7" opacity="0.6"/>
</svg>`;
}

export function treeSvg(opts: {
  streak: number;
  colors: string[];
  bark: string;
  fallbackLeaf: string;
}): string {
  const l = treeLayout(opts.streak, opts.colors, opts.fallbackLeaf);

  const ground = `<ellipse cx="50" cy="${BASE_Y + 4}" rx="26" ry="5" fill="${opts.bark}" opacity="0.25"/>`;

  if (l.index === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  ${ground}
  <ellipse cx="50" cy="${BASE_Y - 3}" rx="7" ry="5.5" fill="${opts.bark}" opacity="0.7"/>
</svg>`;
  }

  const branches = l.branches
    ? `<path d="M50 ${n(BASE_Y - l.stem * 0.55)} Q 38 ${n(BASE_Y - l.stem * 0.78)} 33 ${n(BASE_Y - l.stem * 0.58)}" stroke="${opts.bark}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M50 ${n(BASE_Y - l.stem * 0.4)} Q 62 ${n(BASE_Y - l.stem * 0.62)} 67 ${n(BASE_Y - l.stem * 0.42)}" stroke="${opts.bark}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    : '';

  const leaves = l.leaves
    .map(
      (leaf) =>
        `<circle cx="${n(leaf.cx)}" cy="${n(leaf.cy)}" r="${l.leafR}" fill="${leaf.fill}" opacity="0.95"/>`,
    )
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  ${ground}
  <path d="M50 ${BASE_Y} L50 ${n(BASE_Y - l.stem)}" stroke="${opts.bark}" stroke-width="${l.strokeWidth}" stroke-linecap="round"/>
  ${branches}
  ${leaves}
</svg>`;
}
