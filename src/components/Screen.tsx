import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export function Screen({ title, children }: PropsWithChildren<{ title: string }>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: t.paper, paddingTop: insets.top + spacing.md }]}>
      <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.md },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.md },
  body: { flex: 1 },
});
