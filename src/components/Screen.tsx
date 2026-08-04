import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export function Screen({
  title,
  subtitle,
  action,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  // Sits opposite the title, for the one thing this screen is most likely
  // to need next.
  action?: ReactNode;
}>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: t.paper, paddingTop: insets.top + spacing.md },
      ]}
    >
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: t.inkMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
        {action}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.md },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headText: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  body: { flex: 1 },
});
