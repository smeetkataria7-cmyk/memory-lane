import { memo, useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { blendEmotions, darken, lighten, type EmotionFill } from '../lib/blend';
import { emotionColor } from '../theme/tokens';

type Props = {
  fills: EmotionFill[];
  size: number;
  // The group board only ever receives a blended color, never the
  // underlying emotions - so it renders the glaze from that alone.
  colorOverride?: string;
  // Lit-from-within, for the shelves in Lane. The halo is drawn inside the
  // same viewBox rather than as a second layer, so a wall of these is still
  // one SVG per orb. The sphere shrinks to two thirds to make room.
  glow?: boolean;
};

// A glazed, lit sphere: painterly color-bleed dabs for each emotion,
// then shadow/light/specular layers that make it read as 3D.
export const Orb = memo(function Orb({ fills, size, colorOverride, glow }: Props) {
  // SVG gradient/clip ids are global to the document, not scoped to their own
  // <Svg>. A wall of orbs on Lane used to emit the same ids from every
  // instance - it happened to render correctly, but only because the
  // definitions were identical; a screen mixing glow and non-glow orbs, or a
  // future change to per-orb gradients, would have every orb pick up
  // whichever instance's def resolved first. useId() gives each orb its own
  // namespace so this can't happen regardless of what's on screen with it.
  const uid = useId().replace(/:/g, '');
  const active = colorOverride
    ? []
    : fills.filter((f) => f.weight > 0).sort((a, b) => b.weight - a.weight);
  const base = colorOverride ?? blendEmotions(fills);

  // Deterministic dab positions around the sphere for secondary emotions,
  // seeded by index so a given mix always renders the same orb.
  const dabAnchors = [
    { cx: 0.72, cy: 0.62 },
    { cx: 0.36, cy: 0.78 },
    { cx: 0.75, cy: 0.3 },
    { cx: 0.28, cy: 0.4 },
    { cx: 0.55, cy: 0.85 },
    { cx: 0.2, cy: 0.6 },
    { cx: 0.62, cy: 0.15 },
    { cx: 0.85, cy: 0.5 },
  ];

  const total = active.reduce((s, f) => s + f.weight, 0) || 1;

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        viewBox={glow ? '-25 -25 150 150' : '0 0 100 100'}
      >
        <Defs>
          {glow ? (
            <RadialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={lighten(base, 0.2)} stopOpacity={0.75} />
              <Stop offset="45%" stopColor={base} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={base} stopOpacity={0} />
            </RadialGradient>
          ) : null}
          <RadialGradient id={`${uid}-baseGrad`} cx="35%" cy="30%" r="80%">
            <Stop offset="0%" stopColor={lighten(base, 0.35)} />
            <Stop offset="55%" stopColor={base} />
            <Stop offset="100%" stopColor={darken(base, 0.25)} />
          </RadialGradient>
          {active.slice(1, 1 + dabAnchors.length).map((f, i) => (
            <RadialGradient
              key={`dab-${f.emotion}`}
              id={`${uid}-dab-${i}`}
              cx="50%"
              cy="50%"
              r="50%"
            >
              <Stop offset="0%" stopColor={emotionColor(f.emotion)} stopOpacity={0.85} />
              <Stop offset="70%" stopColor={emotionColor(f.emotion)} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={emotionColor(f.emotion)} stopOpacity={0} />
            </RadialGradient>
          ))}
          <RadialGradient id={`${uid}-coreShadow`} cx="70%" cy="78%" r="70%">
            <Stop offset="0%" stopColor="#000" stopOpacity={0.4} />
            <Stop offset="60%" stopColor="#000" stopOpacity={0.12} />
            <Stop offset="100%" stopColor="#000" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${uid}-topLight`} cx="30%" cy="22%" r="55%">
            <Stop offset="0%" stopColor="#fff" stopOpacity={glow ? 0.3 : 0.55} />
            <Stop offset="60%" stopColor="#fff" stopOpacity={glow ? 0.06 : 0.1} />
            <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${uid}-bounce`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#fff" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
          <ClipPath id={`${uid}-sphere`}>
            <Circle cx="50" cy="50" r="50" />
          </ClipPath>
        </Defs>

        {glow ? <Circle cx="50" cy="50" r="74" fill={`url(#${uid}-halo)`} /> : null}

        <G clipPath={`url(#${uid}-sphere)`}>
          <Circle cx="50" cy="50" r="50" fill={`url(#${uid}-baseGrad)`} />

          {active.slice(1, 1 + dabAnchors.length).map((f, i) => {
            const share = f.weight / total;
            const dabR = 14 + share * 40;
            const a = dabAnchors[i];
            return (
              <Circle
                key={`dabc-${f.emotion}`}
                cx={a.cx * 100}
                cy={a.cy * 100}
                r={dabR}
                fill={`url(#${uid}-dab-${i})`}
              />
            );
          })}

          <Circle cx="50" cy="50" r="50" fill={`url(#${uid}-coreShadow)`} />
          <Circle cx="50" cy="50" r="50" fill={`url(#${uid}-topLight)`} />
          <Ellipse cx="50" cy="90" rx="30" ry="8" fill={`url(#${uid}-bounce)`} />
          {/* On the shelves the orb is small and lit from within, so a full
              specular reads as white plastic. Keep a hint of it instead. */}
          <Ellipse
            cx="33"
            cy="24"
            rx={glow ? 10 : 14}
            ry={glow ? 5 : 7}
            fill="#fff"
            opacity={glow ? 0.55 : 0.9}
            transform="rotate(-28 33 24)"
          />
          {glow ? null : (
            <Ellipse cx="50" cy="32" rx="4" ry="2.4" fill="#fff" opacity={0.55} />
          )}
        </G>
      </Svg>
    </View>
  );
});
