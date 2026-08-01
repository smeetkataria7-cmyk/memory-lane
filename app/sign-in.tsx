import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orb } from '../src/components/Orb';
import { signIn, signUp } from '../src/lib/auth';
import { isSupabaseConfigured } from '../src/lib/supabase';
import { radii, spacing } from '../src/theme/tokens';
import { useTheme } from '../src/theme/useTheme';

export default function SignInScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'up') {
        await signUp(email.trim(), password, name.trim());
        setSentConfirmation(true);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: t.paper }]}>
        <Text style={[styles.title, { color: t.ink }]}>Almost there</Text>
        <Text style={[styles.body, { color: t.inkMuted }]}>
          Add your Supabase URL and anon key to a .env file (see .env.example), then
          restart the app.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: t.paper, paddingTop: insets.top }]}
    >
      <View style={styles.center}>
        <Orb
          size={120}
          fills={[
            { emotion: 'joy', weight: 46 },
            { emotion: 'sadness', weight: 30 },
            { emotion: 'envy', weight: 24 },
          ]}
        />
        <Text style={[styles.title, { color: t.ink }]}>Memory Lane</Text>
        <Text style={[styles.body, { color: t.inkMuted }]}>
          One orb a day, colored by how the day actually felt.
        </Text>

        {sentConfirmation ? (
          <Text style={[styles.body, { color: t.good }]}>
            Check your email to confirm your account, then sign in.
          </Text>
        ) : null}

        <View style={styles.form}>
          {mode === 'up' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={t.inkFaint}
              style={[styles.input, { backgroundColor: t.surface, borderColor: t.line, color: t.ink }]}
            />
          ) : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={t.inkFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { backgroundColor: t.surface, borderColor: t.line, color: t.ink }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={t.inkFaint}
            secureTextEntry
            style={[styles.input, { backgroundColor: t.surface, borderColor: t.line, color: t.ink }]}
          />

          {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={busy || !email || !password}
            style={[
              styles.btn,
              { backgroundColor: busy || !email || !password ? t.surface2 : t.accent },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={t.inkMuted} />
            ) : (
              <Text
                style={[
                  styles.btnText,
                  { color: !email || !password ? t.inkFaint : '#fff' },
                ]}
              >
                {mode === 'up' ? 'Create account' : 'Sign in'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null); }}>
            <Text style={[styles.switch, { color: t.accent }]}>
              {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 30, fontWeight: '700', marginTop: spacing.md },
  body: { fontSize: 15, textAlign: 'center', maxWidth: 300 },
  form: { width: '100%', maxWidth: 360, gap: spacing.sm, marginTop: spacing.lg },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
  },
  btn: {
    borderRadius: radii.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  switch: { fontSize: 14, textAlign: 'center', marginTop: spacing.sm, fontWeight: '600' },
  error: { fontSize: 14, textAlign: 'center' },
});
