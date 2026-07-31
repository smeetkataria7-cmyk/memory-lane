export const EMOTIONS = [
  { key: 'joy', label: 'Joy', color: '#e8b923' },
  { key: 'sadness', label: 'Sadness', color: '#4c6fe7' },
  { key: 'anger', label: 'Anger', color: '#de4a30' },
  { key: 'fear', label: 'Fear', color: '#7c5cd6' },
  { key: 'disgust', label: 'Disgust', color: '#3fa15a' },
  { key: 'anxiety', label: 'Anxiety', color: '#e07f2e' },
  { key: 'envy', label: 'Envy', color: '#229488' },
  { key: 'embarrassment', label: 'Embarrassment', color: '#e07aa0' },
  { key: 'ennui', label: 'Ennui', color: '#8583a3' },
] as const;

export type EmotionKey = (typeof EMOTIONS)[number]['key'];

export const emotionColor = (key: EmotionKey): string =>
  EMOTIONS.find((e) => e.key === key)!.color;

export const light = {
  paper: '#f1f2f7',
  surface: '#ffffff',
  surface2: '#e9eaf1',
  ink: '#1c1b2e',
  inkMuted: '#5c5b74',
  inkFaint: '#86859c',
  line: '#dadbe6',
  accent: '#b9741c',
  accentSoft: '#f4e4cd',
  good: '#2f8f5c',
  goodSoft: '#e6f2ea',
  danger: '#c73a3a',
};

export const dark = {
  paper: '#131220',
  surface: '#1b1930',
  surface2: '#242138',
  ink: '#eeedf6',
  inkMuted: '#a7a5c2',
  inkFaint: '#746f96',
  line: '#302d4c',
  accent: '#f0ab4d',
  accentSoft: '#3a2d17',
  good: '#5cc38a',
  goodSoft: '#17281f',
  danger: '#e46a6a',
};

export type ThemeColors = typeof light;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const POOL_TOTAL = 100;
