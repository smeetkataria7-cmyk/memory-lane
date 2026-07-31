import { emotionColor, type EmotionKey } from '../theme/tokens';

export type EmotionFill = { emotion: EmotionKey; weight: number };

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// Blend in a gamma-corrected space so mixes stay vivid instead of
// collapsing toward grey the way naive sRGB averaging does.
export function blendEmotions(fills: EmotionFill[]): string {
  const active = fills.filter((f) => f.weight > 0);
  if (active.length === 0) return '#8583a3';
  const total = active.reduce((s, f) => s + f.weight, 0);
  let r = 0;
  let g = 0;
  let b = 0;
  for (const f of active) {
    const [er, eg, eb] = hexToRgb(emotionColor(f.emotion));
    const w = f.weight / total;
    r += w * (er / 255) ** 2.2;
    g += w * (eg / 255) ** 2.2;
    b += w * (eb / 255) ** 2.2;
  }
  return rgbToHex([255 * r ** (1 / 2.2), 255 * g ** (1 / 2.2), 255 * b ** (1 / 2.2)]);
}

export function dominantEmotion(fills: EmotionFill[]): EmotionFill | null {
  const active = fills.filter((f) => f.weight > 0);
  if (active.length === 0) return null;
  return active.reduce((a, b) => (b.weight > a.weight ? b : a));
}

export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  ]);
}

export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}
