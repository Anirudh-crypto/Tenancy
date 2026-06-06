import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Trim accidental whitespace/newlines that can sneak in when a secret is pasted.
// A stray trailing newline in the anon key causes Supabase to reject every
// request with "Invalid API key".
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced early so misconfiguration is obvious during development.
  console.warn(
    `Supabase env vars are missing. url=${supabaseUrl ? 'set' : 'MISSING'} key=${
      supabaseAnonKey ? 'set' : 'MISSING'
    }`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // On web, persisting to AsyncStorage (localStorage shim) is fine; on native we use AsyncStorage.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'tenant' | 'landlord';
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}
