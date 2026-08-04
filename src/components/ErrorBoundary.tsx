import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dark, light, radii, spacing } from '../theme/tokens';

type Props = { children: ReactNode; scheme: 'light' | 'dark' };
type State = { error: Error | null };

// A render throw anywhere below this used to leave a white screen with no
// way out. Class component because there is still no hook equivalent of
// componentDidCatch.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept for the dev console; there is no crash reporter wired up yet.
    console.error('Memory Lane crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const t = this.props.scheme === 'dark' ? dark : light;

    return (
      <View style={[styles.root, { backgroundColor: t.paper }]}>
        <Text style={[styles.title, { color: t.ink }]}>Something broke</Text>
        <Text style={[styles.body, { color: t.inkMuted }]}>
          Your days are saved — this is only the screen failing to draw.
        </Text>
        <Text style={[styles.detail, { color: t.inkFaint }]} numberOfLines={4}>
          {error.message}
        </Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          style={[styles.btn, { backgroundColor: t.accent }]}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  detail: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: spacing.xs,
  },
  btn: {
    marginTop: spacing.md,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: radii.pill,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
