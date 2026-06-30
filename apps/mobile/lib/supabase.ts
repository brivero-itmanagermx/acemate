import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Log what Metro actually inlined so the missing var is obvious in the console
  console.error(
    '[AceMate] Supabase env vars missing.\n' +
    `  EXPO_PUBLIC_SUPABASE_URL  = ${JSON.stringify(supabaseUrl)}\n` +
    `  EXPO_PUBLIC_SUPABASE_ANON_KEY = ${JSON.stringify(supabaseKey)}\n` +
    '  Ensure apps/mobile/.env exists with these values and restart Metro (clear cache).'
  );
}

export const supabase = createClient(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseKey  ?? 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
