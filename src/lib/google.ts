import { makeRedirectUri } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({ scheme: 'memorylane', path: 'auth/callback' });

// Google gives us a name and picture; seed the profile with them so the
// board is readable from day one instead of showing blank initials.
async function seedProfileFromGoogle(userId: string) {
  const { data } = await supabase.auth.getUser();
  const meta = data.user?.user_metadata ?? {};
  const name =
    (meta.full_name as string) || (meta.name as string) || '';
  const picture = (meta.avatar_url as string) || (meta.picture as string) || '';

  const { data: existing } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  const patch: Record<string, string> = {};
  if (name && !existing?.display_name) patch.display_name = name;
  if (picture && !existing?.avatar_url) patch.avatar_url = picture;
  if (Object.keys(patch).length === 0) return;

  await supabase.from('profiles').update(patch).eq('id', userId);
}

export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw error;
  if (Platform.OS === 'web' || !data.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;

  const { params, errorCode } = getQueryParams(result.url);
  if (errorCode) throw new Error(errorCode);

  // PKCE hands back a code to exchange; implicit hands back tokens.
  if (params.code) {
    const { data: session, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(params.code);
    if (exchangeError) throw exchangeError;
    if (session.user) await seedProfileFromGoogle(session.user.id);
    return;
  }

  if (params.access_token && params.refresh_token) {
    const { data: session, error: setError } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (setError) throw setError;
    if (session.user) await seedProfileFromGoogle(session.user.id);
  }
}
