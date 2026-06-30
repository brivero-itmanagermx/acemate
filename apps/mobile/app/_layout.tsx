import 'react-native-url-polyfill/auto';
import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

interface AuthCtx {
  session: Session | null;
  userId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  session: null,
  userId: null,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      if (!s) setOnboarded(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check onboarding status whenever session is set.
  // Uses Supabase directly (not the Hono API) so this works on physical devices
  // where http://localhost:3001 is unreachable.
  useEffect(() => {
    if (!session) { setOnboarded(null); return; }

    const userId = session.user.id;
    supabase
      .from('profiles')
      .select('level, dominant_hand, preferred_surface')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        console.log('[AceMate] profile completeness check', {
          userId,
          level: data?.level,
          dominant_hand: data?.dominant_hand,
          preferred_surface: data?.preferred_surface,
          supabaseError: error?.message ?? null,
        });
        if (error || !data) {
          setOnboarded(false);
          return;
        }
        setOnboarded(!!data.level && !!data.dominant_hand && !!data.preferred_surface);
      });
  }, [session?.user.id]);

  // Navigation guard
  useEffect(() => {
    if (session === undefined) return; // still loading

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/signin');
      return;
    }

    if (onboarded === null) return; // still fetching profile

    if (!onboarded) {
      if (!inOnboarding) router.replace('/(onboarding)');
      return;
    }

    // Session + onboarded: go to tabs if still in auth/onboarding
    if (inAuth || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [session, onboarded, segments]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Show spinner while hydrating session
  if (session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.aceGreen} size="large" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ session, userId: session?.user?.id ?? null, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="match/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="players/[id]" />
          <Stack.Screen name="profile/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
