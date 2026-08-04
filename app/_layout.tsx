import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { isSupabaseConfigured } from '../src/lib/supabase';
import { useTheme } from '../src/theme/useTheme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const t = useTheme();

  useEffect(() => {
    if (loading) return;
    const onSignIn = segments[0] === 'sign-in';
    // /auth/callback is signed-out by definition: it is where the OAuth code
    // is exchanged for a session. Bouncing it to sign-in kills the exchange
    // mid-flight, which is what made Google sign-in flash an error screen.
    const onCallback = segments[0] === 'auth';
    if (!session && !onSignIn && !onCallback) {
      router.replace('/sign-in');
    } else if (session && onSignIn) {
      router.replace('/');
    }
  }, [session, loading, segments, router]);

  if (loading && isSupabaseConfigured) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.paper }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.paper },
      }}
    />
  );
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary scheme={scheme}>
          <AuthProvider>
            <StatusBar style="auto" />
            <AuthGate />
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
