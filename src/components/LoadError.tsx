import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Screens used to swallow load failures and render as if there were simply
// nothing to show, which is indistinguishable from a new account. Say what
// happened and offer the retry.
export function LoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: t.ink }]}>Could not load this</Text>
      <Text style={[styles.body, { color: t.inkMuted }]}>{message}</Text>
      <Pressable onPress={onRetry} style={[styles.btn, { backgroundColor: t.surface2 }]}>
        <Text style={[styles.btnText, { color: t.ink }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 300 },
  btn: {
    marginTop: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: radii.pill,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
});
