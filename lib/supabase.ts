import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type {
  Inspection,
  InspectionPhoto,
  Property,
  PropertyTenant,
  RiskSignal,
  Ticket,
  TimelineEvent,
} from './types';

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
    rent: row.rent,
    deposit: row.deposit,
    tenantName: (row.tenants ?? []).map((t) => t.name).join(', ') || '—',
    landlordName: row.landlord_name,
    moveInDate: row.move_in_date,
    status: row.status,
    propertyType: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    sizeSqm: row.size_sqm,
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return { ok: true, property: rowToProperty(data as PropertyRow) };
}

// ---------------------------------------------------------------------------
// Property-scoped data: tickets, timeline events, inspections, risks.
// All rows hang off a property and are protected by RLS (owner of the property).
// ---------------------------------------------------------------------------

interface TicketRow {
  id: string;
  property_id: string;
  title: string;
  description: string;
  category: string;
  urgency: Ticket['urgency'];
  status: Ticket['status'];
  reporter: 'tenant' | 'landlord';
  legal_deadline: string | null;
  legal_note: string | null;
  responses: Ticket['responses'] | null;
  created_at: string;
}

function rowToTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    propertyId: row.property_id,
    title: row.title,
    description: row.description,
    category: row.category,
    urgency: row.urgency,
    status: row.status,
    createdAt: row.created_at,
    reporter: row.reporter,
    legalDeadline: row.legal_deadline ?? undefined,
    legalNote: row.legal_note ?? undefined,
    responses: row.responses ?? [],
  };
}

interface TimelineRow {
  id: string;
  property_id: string;
  type: TimelineEvent['type'];
  title: string;
  detail: string;
  actor: TimelineEvent['actor'];
  at: string;
}

function rowToTimeline(row: TimelineRow): TimelineEvent {
  return {
    id: row.id,
    propertyId: row.property_id,
    type: row.type,
    title: row.title,
    detail: row.detail,
    actor: row.actor,
    at: row.at,
  };
}

interface InspectionRow {
  id: string;
  property_id: string;
  kind: Inspection['kind'];
  signed_at: string | null;
  signed_by: string | null;
  photos: InspectionPhoto[] | null;
  created_at: string;
}

function rowToInspection(row: InspectionRow): Inspection {
  return {
    id: row.id,
    propertyId: row.property_id,
    kind: row.kind,
    createdAt: row.created_at,
    signedAt: row.signed_at ?? undefined,
    signedBy: row.signed_by ?? undefined,
    photos: row.photos ?? [],
  };
}

interface RiskRow {
  id: string;
  property_id: string;
  title: string;
  level: RiskSignal['level'];
  category: RiskSignal['category'];
  rationale: string;
  recommendation: string;
  created_at: string;
}

function rowToRisk(row: RiskRow): RiskSignal {
  return {
    id: row.id,
    propertyId: row.property_id,
    title: row.title,
    level: row.level,
    category: row.category,
    rationale: row.rationale,
    recommendation: row.recommendation,
  };
}

export interface PropertyData {
  tickets: Ticket[];
  timeline: TimelineEvent[];
  inspections: Inspection[];
  risks: RiskSignal[];
}

export async function fetchPropertyData(propertyId: string): Promise<PropertyData> {
  const [tk, tl, ins, rk] = await Promise.all([
    supabase
      .from('tickets')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('timeline_events')
      .select('*')
      .eq('property_id', propertyId)
      .order('at', { ascending: false }),
    supabase
      .from('inspections')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('risks')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false }),
  ]);
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    tickets: tk.error || !tk.data ? [] : (tk.data as TicketRow[]).map(rowToTicket),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    timeline: tl.error || !tl.data ? [] : (tl.data as TimelineRow[]).map(rowToTimeline),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    inspections: ins.error || !ins.data ? [] : (ins.data as InspectionRow[]).map(rowToInspection),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    risks: rk.error || !rk.data ? [] : (rk.data as RiskRow[]).map(rowToRisk),
  };
}

export async function insertTicket(
  propertyId: string,
  input: Omit<Ticket, 'id' | 'propertyId' | 'createdAt'>
): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      property_id: propertyId,
      title: input.title,
      description: input.description,
      category: input.category,
      urgency: input.urgency,
      status: input.status,
      reporter: input.reporter,
      legal_deadline: input.legalDeadline ?? null,
      legal_note: input.legalNote ?? null,
      responses: input.responses ?? [],
    })
    .select('*')
    .single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return rowToTicket(data as TicketRow);
}

export async function updateTicket(
  ticketId: string,
  patch: Partial<Pick<Ticket, 'status' | 'responses'>>
): Promise<boolean> {
  const payload: Record<string, unknown> = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.responses !== undefined) payload.responses = patch.responses;
  const { error } = await supabase.from('tickets').update(payload).eq('id', ticketId);
  return !error;
}

export async function insertTimelineEvent(
  propertyId: string,
  input: Omit<TimelineEvent, 'id' | 'propertyId'>
): Promise<TimelineEvent | null> {
  const { data, error } = await supabase
    .from('timeline_events')
    .insert({
      property_id: propertyId,
      type: input.type,
      title: input.title,
      detail: input.detail,
      actor: input.actor,
      at: input.at,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return rowToTimeline(data as TimelineRow);
}

export async function insertInspection(
  propertyId: string,
  kind: Inspection['kind']
): Promise<Inspection | null> {
  const { data, error } = await supabase
    .from('inspections')
    .insert({ property_id: propertyId, kind, photos: [] })
    .select('*')
    .single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return rowToInspection(data as InspectionRow);
}

export async function updateInspection(
  inspectionId: string,
  patch: Partial<Pick<Inspection, 'photos' | 'signedAt' | 'signedBy'>>
): Promise<boolean> {
  const payload: Record<string, unknown> = {};
  if (patch.photos !== undefined) payload.photos = patch.photos;
  if (patch.signedAt !== undefined) payload.signed_at = patch.signedAt;
  if (patch.signedBy !== undefined) payload.signed_by = patch.signedBy;
  const { error } = await supabase.from('inspections').update(payload).eq('id', inspectionId);
  return !error;
}

export async function insertRisk(
  propertyId: string,
  input: Omit<RiskSignal, 'id' | 'propertyId'>
): Promise<RiskSignal | null> {
  const { data, error } = await supabase
    .from('risks')
    .insert({
      property_id: propertyId,
      title: input.title,
      level: input.level,
      category: input.category,
      rationale: input.rationale,
      recommendation: input.recommendation,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return rowToRisk(data as RiskRow);
}
