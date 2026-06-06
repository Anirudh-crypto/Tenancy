import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Property, PropertyTenant } from './types';

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

/**
 * Returns the profile for the currently authenticated user, creating it from the
 * auth user's metadata if the row is missing. This makes sign-in resilient when
 * the `on_auth_user_created` trigger didn't fire (e.g. user created before the
 * trigger existed), instead of leaving the app stuck on the login screen.
 */
export async function ensureProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const authUser = userData.user;
  if (!authUser) return null;

  const existing = await fetchProfile(authUser.id);
  if (existing) return existing;

  const meta = (authUser.user_metadata ?? {}) as { name?: string; role?: string };
  const role: Profile['role'] = meta.role === 'landlord' ? 'landlord' : 'tenant';
  const profile: Profile = {
    id: authUser.id,
    email: authUser.email ?? '',
    name: meta.name ?? '',
    role,
  };

  const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
  if (error) {
    // Even if the insert fails (e.g. transient), return the in-memory profile so
    // the user can proceed rather than being bounced back to login.
    return profile;
  }
  return (await fetchProfile(authUser.id)) ?? profile;
}

// ---------------------------------------------------------------------------
// Properties (landlord-owned, persisted in Supabase)
// ---------------------------------------------------------------------------

interface PropertyRow {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  rent: number;
  deposit: number;
  landlord_name: string;
  status: 'occupied' | 'vacant';
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number;
  floor: string | null;
  notes: string | null;
  move_in_date: string;
  tenants: PropertyTenant[] | null;
  created_at: string;
}

function rowToProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    rent: Number(row.rent),
    deposit: Number(row.deposit),
    tenantName: (row.tenants ?? []).map((t) => t.name).join(', ') || '—',
    landlordName: row.landlord_name,
    moveInDate: row.move_in_date,
    status: row.status,
    propertyType: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    sizeSqm: Number(row.size_sqm),
    floor: row.floor ?? undefined,
    notes: row.notes ?? undefined,
    tenants: row.tenants ?? [],
  };
}

export type NewPropertyInput = Omit<Property, 'id' | 'tenantName'>;

export async function fetchProperties(ownerId: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as PropertyRow[]).map(rowToProperty);
}

export async function insertProperty(
  ownerId: string,
  input: NewPropertyInput
): Promise<{ ok: true; property: Property } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('properties')
    .insert({
      owner_id: ownerId,
      name: input.name,
      address: input.address,
      city: input.city,
      rent: input.rent,
      deposit: input.deposit,
      landlord_name: input.landlordName,
      status: input.status,
      property_type: input.propertyType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      size_sqm: input.sizeSqm,
      floor: input.floor ?? null,
      notes: input.notes ?? null,
      move_in_date: input.moveInDate,
      tenants: input.tenants ?? [],
    })
    .select('*')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Could not save property.' };
  }
  return { ok: true, property: rowToProperty(data as PropertyRow) };
}
