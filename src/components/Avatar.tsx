import { Image, StyleSheet, Text, View } from 'react-native';
import type { Profile } from '../lib/profiles';
import { useTheme } from '../theme/useTheme';

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

export function Avatar({
  profile,
  size = 40,
}: {
  profile: Pick<Profile, 'display_name' | 'avatar_url'>;
  size?: number;
}) {
  const t = useTheme();
  if (profile.avatar_url) {
    return (
      <Image
        source={{ uri: profile.avatar_url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.surface2,
        },
      ]}
    >
      <Text style={{ color: t.inkMuted, fontSize: size * 0.36, fontWeight: '700' }}>
        {initials(profile.display_name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
