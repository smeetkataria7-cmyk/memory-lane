import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/useTheme';

export default function AuthCallbackScreen() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    const complete = async () => {
      try {
        if (params.code) {
          await supabase.auth.exchangeCodeForSession(params.code);
        }
      } catch {}
      router.replace('/');
    };
    complete();
  }, [params.code, router]);

  return (
    <View style={[styles.root, { backgroundColor: t.paper }]}>
      <ActivityIndicator color={t.accent} size="large" />
      <Text style={[styles.text, { color: t.inkMuted }]}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  text: { fontSize: 16, fontWeight: '600' },
});
