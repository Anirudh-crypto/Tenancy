import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { genId, triageTicket } from './ai';
import {
  createInvite as createInviteDb,
  ensureProfile,
  fetchInvitesForProperty,
  fetchProfile,
  fetchProperties,
  fetchPropertyById,
  fetchPropertyData,
  insertInspection,
  insertProperty,
  insertTicket,
  insertTimelineEvent,
  type NewPropertyInput,
  previewInvite,
  type PropertyInvite,
  redeemInvite as redeemInviteDb,
  revokeInvite as revokeInviteDb,
  supabase,
  updateInspection,
  updateTicket,
} from './supabase';
import type {
  DetectedDamage,
  Inspection,
  InspectionKind,
  InspectionPhoto,
  Property,
  RiskSignal,
  Role,
  RoomKey,
  Ticket,
  TimelineEvent,
  TimelineType,
  User,
} from './types';

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

/**
 * The tenant demo property. It is NOT a row in the `properties` table, so its
 * tickets/timeline/inspections/risks are kept in-memory (and persisted via
 * AsyncStorage) rather than written to Supabase. Landlord-created properties
 * are DB-backed and FK-safe.
 */
export const SEED_PROPERTY_ID = 'prop_1';

const SEED_PROPERTY: Property = {
  id: SEED_PROPERTY_ID,
  name: 'Altbau · 3 Zimmer',
  address: 'Schönhauser Allee 142',
  city: 'Berlin',
  rent: 1180,
  deposit: 3540,
  tenantName: 'Lena Hoffmann',
  landlordName: 'M. Becker Immobilien',
  moveInDate: iso(420),
  status: 'occupied',
  propertyType: 'Apartment · Altbau',
  bedrooms: 3,
  bathrooms: 1,
  sizeSqm: 86,
  floor: '3rd floor',
  notes: 'Period building, high ceilings. Bathroom prone to moisture — see open risks.',
  tenants: [
    {
      id: 'ten_1',
      name: 'Lena Hoffmann',
      email: 'lena.hoffmann@example.com',
      phone: '+49 30 1234 5678',
      moveInDate: iso(420),
      leaseEndDate: iso(-300),
    },
  ],
};

const SEED_TIMELINE: TimelineEvent[] = [
  { id: 't1', propertyId: SEED_PROPERTY_ID, type: 'move_in', title: 'Move-in completed', detail: 'Signed move-in report with 6 documented pre-existing items.', at: iso(420), actor: 'system' },
  { id: 't2', propertyId: SEED_PROPERTY_ID, type: 'agreement', title: 'House rules acknowledged', detail: 'Quiet hours 22:00–06:00, shared cleaning rota agreed.', at: iso(418), actor: 'tenant' },
  { id: 't3', propertyId: SEED_PROPERTY_ID, type: 'maintenance', title: 'Dishwasher not draining', detail: 'Reported and resolved within 5 days.', at: iso(300), actor: 'tenant' },
  { id: 't4', propertyId: SEED_PROPERTY_ID, type: 'inspection', title: 'Annual inspection visit', detail: 'No issues noted. Photos archived.', at: iso(180), actor: 'landlord' },
  { id: 't5', propertyId: SEED_PROPERTY_ID, type: 'maintenance', title: 'Mold spots in bathroom', detail: 'Reported. Ventilation advice given, not yet remediated.', at: iso(60), actor: 'tenant' },
  { id: 't6', propertyId: SEED_PROPERTY_ID, type: 'maintenance', title: 'Mold spots returned', detail: 'Second report of mold in same location.', at: iso(12), actor: 'tenant' },
];

const SEED_TICKETS: Ticket[] = [
  {
    id: 'tkt_seed_1',
    propertyId: SEED_PROPERTY_ID,
    title: 'Bathroom mold returning',
    description: 'Black mold on the grout near the shower has come back even after cleaning.',
    category: 'Moisture / Mold',
    urgency: 'high',
    status: 'acknowledged',
    createdAt: iso(12),
    reporter: 'tenant',
    legalDeadline: iso(-2),
    legalNote: 'Mold can be a health hazard and grounds for Mietminderung. Document thoroughly and notify landlord in writing.',
    responses: [
      { id: 'r1', author: 'landlord', text: 'Noted. Please ventilate 3x daily, we will send a technician.', at: iso(10) },
    ],
  },
  {
    id: 'tkt_seed_2',
    propertyId: SEED_PROPERTY_ID,
    title: 'Kitchen window won’t lock',
    description: 'The handle spins freely and the window does not lock shut.',
    category: 'Security / Fixtures',
    urgency: 'medium',
    status: 'open',
    createdAt: iso(4),
    reporter: 'tenant',
    legalDeadline: iso(-10),
    legalNote: 'Repair should be scheduled within a reasonable timeframe.',
    responses: [],
  },
];

const SEED_RISKS: RiskSignal[] = [
  {
    id: 'risk_1',
    propertyId: SEED_PROPERTY_ID,
    title: 'High probability of moisture damage within 6 months',
    level: 'high',
    category: 'moisture',
    rationale: 'Mold reported twice in the bathroom (60 and 12 days ago). Ventilation issue remains unresolved.',
    recommendation: 'Schedule professional remediation and a humidity assessment before it spreads to structural elements.',
  },
  {
    id: 'risk_2',
    propertyId: SEED_PROPERTY_ID,
    title: 'Deposit dispute risk: Medium',
    level: 'medium',
    category: 'deposit',
    rationale: 'Unresolved mold could be wrongly attributed to the tenant at move-out.',
    recommendation: 'Keep the move-in report and all mold reports timestamped to establish landlord responsibility.',
  },
];

/** The seed property's data is held here so the tenant demo keeps working offline. */
interface SeedData {
  tickets: Ticket[];
  timeline: TimelineEvent[];
  inspections: Inspection[];
  risks: RiskSignal[];
}

interface State {
  /** The tenant's single demo property (also seeds the seed-data store below). */
  property: Property;
  /** Landlord-owned, DB-backed properties. */
  properties: Property[];
  propertiesLoading: boolean;

  /** The property whose tabs are currently shown. null = none open. */
  activePropertyId: string | null;
  /** Data for the active property only (loaded from DB, or seed for the demo property). */
  tickets: Ticket[];
  timeline: TimelineEvent[];
  inspections: Inspection[];
  risks: RiskSignal[];
  propertyDataLoading: boolean;

  /** In-memory store for the seed (tenant demo) property's data. */
  seedData: SeedData;

  role: 'tenant' | 'landlord';
  hydrated: boolean;

  user: User | null;

  initAuth: () => Promise<void>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  requestPasswordReset: (
    email: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  verifyPasswordReset: (
    email: string,
    token: string,
    newPassword: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;

  /** Sign up a tenant with an invite code: creates account (username+password),
   *  then redeems the code to link them to the property. */
  signUpTenantWithInvite: (input: {
    username: string;
    password: string;
    code: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;

  /** Invites (landlord) */
  invites: PropertyInvite[];
  invitesLoading: boolean;
  loadInvites: (propertyId: string) => Promise<void>;
  generateInvite: (
    propertyId: string
  ) => Promise<{ ok: true; invite: PropertyInvite } | { ok: false; error: string }>;
  revokeInvite: (inviteId: string) => Promise<void>;

  setRole: (r: 'tenant' | 'landlord') => void;
  getProperty: (id: string) => Property | undefined;
  loadProperties: () => Promise<void>;
  addProperty: (
    input: NewPropertyInput
  ) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;

  /** Open a property: set it active and load its scoped data. */
  setActiveProperty: (id: string) => Promise<void>;
  clearActiveProperty: () => void;
  reloadActivePropertyData: () => Promise<void>;

  addTicket: (input: { title: string; description: string }) => Promise<Ticket | null>;
  respondToTicket: (ticketId: string, text: string) => Promise<void>;
  setTicketStatus: (ticketId: string, status: Ticket['status']) => Promise<void>;
  addTimelineEvent: (e: Omit<TimelineEvent, 'id' | 'at' | 'propertyId'> & { at?: string }) => Promise<void>;

  createInspection: (kind: InspectionKind) => Promise<string | null>;
  addInspectionPhoto: (
    inspectionId: string,
    room: RoomKey,
    uri: string,
    damages: DetectedDamage[]
  ) => Promise<void>;
  signInspection: (inspectionId: string, signedBy: string) => Promise<void>;
}

function isSeed(id: string | null): boolean {
  return id === SEED_PROPERTY_ID;
}

function timelineForTicket(t: Ticket): Omit<TimelineEvent, 'id' | 'at' | 'propertyId'> {
  return {
    type: 'maintenance' as TimelineType,
    title: `Reported: ${t.title}`,
    detail: `${t.category} · ${t.urgency} urgency`,
    actor: t.reporter,
  };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      property: SEED_PROPERTY,
      properties: [],
      propertiesLoading: false,

      activePropertyId: null,
      tickets: [],
      timeline: [],
      inspections: [],
      risks: [],
      propertyDataLoading: false,

      seedData: {
        tickets: SEED_TICKETS,
        timeline: SEED_TIMELINE,
        inspections: [],
        risks: SEED_RISKS,
      },

      role: 'tenant',
      hydrated: false,

      user: null,

      invites: [],
      invitesLoading: false,
      initAuth: async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const session = data.session;
          if (session?.user) {
            const profile = await ensureProfile();
            if (profile) {
              set({ user: profile, role: profile.role });
              if (profile.role === 'landlord') {
                void get().loadProperties();
              } else if (profile.tenantPropertyId) {
                void get().setActiveProperty(profile.tenantPropertyId);
              } else {
                void get().setActiveProperty(SEED_PROPERTY_ID);
              }
            }
          }
        } catch {
          // ignore — treated as signed out
        } finally {
          set({ hydrated: true });
        }

        supabase.auth.onAuthStateChange((_event, session) => {
          if (!session?.user) {
            set({ user: null, properties: [], activePropertyId: null });
            return;
          }
          void (async () => {
            const profile = await ensureProfile();
            if (profile) {
              set({ user: profile, role: profile.role });
              if (profile.role === 'landlord') {
                void get().loadProperties();
              } else if (profile.tenantPropertyId) {
                void get().setActiveProperty(profile.tenantPropertyId);
              } else {
                void get().setActiveProperty(SEED_PROPERTY_ID);
              }
            }
          })();
        });
      },

      signIn: async (email, password) => {        const normalized = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (error || !data.user) {
          return { ok: false, error: error?.message ?? 'Invalid email or password.' };
        }
        const profile = await ensureProfile();
        if (!profile) {
          return { ok: false, error: 'Could not load your profile. Please try again.' };
        }
        set({ user: profile, role: profile.role });
        if (profile.role === 'landlord') {
          void get().loadProperties();
        } else if (profile.tenantPropertyId) {
          void get().setActiveProperty(profile.tenantPropertyId);
        } else {
          void get().setActiveProperty(SEED_PROPERTY_ID);
        }
        return { ok: true };
      },

      signUp: async ({ name, email, password, role }) => {
        const normalized = email.trim().toLowerCase();
        if (!name.trim()) return { ok: false, error: 'Please enter your name.' };
        if (!normalized.includes('@')) return { ok: false, error: 'Enter a valid email address.' };
        if (password.length < 6) {
          return { ok: false, error: 'Password must be at least 6 characters.' };
        }
        const { data, error } = await supabase.auth.signUp({
          email: normalized,
          password,
          options: { data: { name: name.trim(), role } },
        });

        // Email confirmation is disabled, so no confirmation email should be
        // sent. If the project still has it enabled, signUp tries to email a
        // confirmation link and can fail with "email rate limit exceeded" even
        // though the account was created. In that case we don't treat it as
        // fatal — we try to sign in with the credentials we just submitted.
        const rateLimited =
          !!error && /rate limit|email/i.test(error.message);
        if (error && !rateLimited) {
          return { ok: false, error: error.message };
        }

        // Sign in with the password we just set to obtain a session
        // immediately (covers both the rate-limited case and a project where
        // signUp returns no session because confirmation is enabled).
        if (rateLimited || !data?.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: normalized,
            password,
          });
          if (signInError) {
            // If we can't sign in either, surface the original signUp error if
            // it was a real failure, otherwise the sign-in error.
            return {
              ok: false,
              error: error
                ? 'Account created, but email confirmation is enabled on the server. Disable “Confirm email” in your Supabase Auth settings, then sign in.'
                : signInError.message,
            };
          }
        }

        const profile = await ensureProfile();
        if (!profile) {
          return { ok: false, error: 'Could not create your profile. Please try again.' };
        }
        set({ user: profile, role: profile.role });
        if (profile.role === 'landlord') {
          void get().loadProperties();
        } else {
          void get().setActiveProperty(SEED_PROPERTY_ID);
        }
        return { ok: true };
      },

      requestPasswordReset: async (email) => {
        const normalized = email.trim().toLowerCase();
        if (!normalized.includes('@')) {
          return { ok: false, error: 'Enter a valid email address.' };
        }
        const { error } = await supabase.auth.resetPasswordForEmail(normalized);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },

      verifyPasswordReset: async (email, token, newPassword) => {
        const normalized = email.trim().toLowerCase();
        if (newPassword.length < 6) {
          return { ok: false, error: 'Password must be at least 6 characters.' };
        }
        const { data, error } = await supabase.auth.verifyOtp({
          email: normalized,
          token: token.trim(),
          type: 'recovery',
        });
        if (error || !data.user) {
          return { ok: false, error: error?.message ?? 'Invalid or expired code.' };
        }
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) {
          return { ok: false, error: updateError.message };
        }
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          set({ user: profile, role: profile.role });
        }
        return { ok: true };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, properties: [], activePropertyId: null, invites: [] });
      },

      signUpTenantWithInvite: async ({ username, password, code }) => {
        const cleanUser = username.trim();
        if (cleanUser.length < 3) {
          return { ok: false, error: 'Username must be at least 3 characters.' };
        }
        if (!/^[a-zA-Z0-9_.]+$/.test(cleanUser)) {
          return { ok: false, error: 'Username can only use letters, numbers, _ and .' };
        }
        if (password.length < 6) {
          return { ok: false, error: 'Password must be at least 6 characters.' };
        }
        if (!code.trim()) {
          return { ok: false, error: 'Enter the invite code from your landlord.' };
        }

        // Validate the code first so we fail before creating an orphan account.
        const preview = await previewInvite(code);
        if (!preview) {
          return { ok: false, error: 'That invite code is invalid or has already been used.' };
        }

        // Synthesize an internal email from the username (Supabase requires an email).
        const synthEmail = `${cleanUser.toLowerCase()}@tenant.tenancyos.app`;

        const { data, error } = await supabase.auth.signUp({
          email: synthEmail,
          password,
          options: { data: { name: cleanUser, role: 'tenant' } },
        });

        const rateLimited = !!error && /rate limit|email/i.test(error.message);
        if (error && !rateLimited && /already registered|already exists/i.test(error.message)) {
          return { ok: false, error: 'That username is taken. Try another.' };
        }
        if (error && !rateLimited) {
          return { ok: false, error: error.message };
        }
        if (rateLimited || !data?.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: synthEmail,
            password,
          });
          if (signInError) {
            return { ok: false, error: 'Could not create your account. Please try again.' };
          }
        }

        // Ensure the profile row exists, then redeem the code (links profile -> property).
        await ensureProfile();
        const redeemed = await redeemInviteDb(code);
        if (!redeemed.ok) {
          return { ok: false, error: redeemed.error };
        }

        const profile = await ensureProfile();
        if (!profile) {
          return { ok: false, error: 'Could not load your profile. Please try again.' };
        }
        set({ user: profile, role: 'tenant' });
        await get().setActiveProperty(redeemed.propertyId);
        return { ok: true };
      },

      loadInvites: async (propertyId) => {
        set({ invitesLoading: true });
        try {
          const invites = await fetchInvitesForProperty(propertyId);
          set({ invites });
        } finally {
          set({ invitesLoading: false });
        }
      },

      generateInvite: async (propertyId) => {
        const user = get().user;
        if (!user) return { ok: false, error: 'You must be signed in.' };
        const result = await createInviteDb(user.id, propertyId);
        if (!result.ok) return result;
        set((s) => ({ invites: [result.invite, ...s.invites] }));
        return result;
      },

      revokeInvite: async (inviteId) => {
        const ok = await revokeInviteDb(inviteId);
        if (ok) {
          set((s) => ({
            invites: s.invites.map((i) =>
              i.id === inviteId ? { ...i, status: 'revoked' as const } : i
            ),
          }));
        }
      },

      setRole: (role) => set({ role }),
      getProperty: (id) => {
        if (id === SEED_PROPERTY_ID) return get().property;
        return get().properties.find((p) => p.id === id);
      },

      loadProperties: async () => {
        const user = get().user;
        if (!user) return;
        set({ propertiesLoading: true });
        try {
          const properties = await fetchProperties(user.id);
          set({ properties });
        } finally {
          set({ propertiesLoading: false });
        }
      },

      addProperty: async (input) => {
        const user = get().user;
        if (!user) return { ok: false, error: 'You must be signed in.' };
        const result = await insertProperty(user.id, input);
        if (!result.ok) return result;
        set((s) => ({ properties: [result.property, ...s.properties] }));
        return { ok: true, id: result.property.id };
      },

      setActiveProperty: async (id) => {
        set({ activePropertyId: id, propertyDataLoading: true });
        try {
          if (isSeed(id)) {
            const seed = get().seedData;
            set({
              tickets: seed.tickets,
              timeline: seed.timeline,
              inspections: seed.inspections,
              risks: seed.risks,
            });
          } else {
            // Cache the property itself so getProperty(id) resolves for tenants
            // (whose linked property isn't in the landlord `properties` list).
            if (!get().properties.some((p) => p.id === id)) {
              const prop = await fetchPropertyById(id);
              if (prop) set((s) => ({ properties: [prop, ...s.properties] }));
            }
            const data = await fetchPropertyData(id);
            set({
              tickets: data.tickets,
              timeline: data.timeline,
              inspections: data.inspections,
              risks: data.risks,
            });
          }
        } finally {
          set({ propertyDataLoading: false });
        }
      },

      clearActiveProperty: () =>
        set({ activePropertyId: null, tickets: [], timeline: [], inspections: [], risks: [] }),

      reloadActivePropertyData: async () => {
        const id = get().activePropertyId;
        if (id) await get().setActiveProperty(id);
      },

      addTicket: async ({ title, description }) => {
        const propertyId = get().activePropertyId;
        if (!propertyId) return null;
        const triage = triageTicket(`${title} ${description}`);
        const base: Omit<Ticket, 'id' | 'propertyId' | 'createdAt'> = {
          title,
          description,
          category: triage.category,
          urgency: triage.urgency,
          status: 'open',
          reporter: get().role,
          legalDeadline: triage.legalDeadline,
          legalNote: triage.legalNote,
          responses: [],
        };

        let ticket: Ticket;
        if (isSeed(propertyId)) {
          ticket = { ...base, id: genId('tkt'), propertyId, createdAt: new Date().toISOString() };
          set((s) => ({
            tickets: [ticket, ...s.tickets],
            seedData: { ...s.seedData, tickets: [ticket, ...s.seedData.tickets] },
          }));
        } else {
          const saved = await insertTicket(propertyId, base);
          if (!saved) return null;
          ticket = saved;
          set((s) => ({ tickets: [ticket, ...s.tickets] }));
        }
        await get().addTimelineEvent(timelineForTicket(ticket));
        return ticket;
      },

      respondToTicket: async (ticketId, text) => {
        const propertyId = get().activePropertyId;
        const role = get().role;
        const ticket = get().tickets.find((t) => t.id === ticketId);
        if (!ticket) return;
        const nextResponses = [
          ...ticket.responses,
          { id: genId('resp'), author: role, text, at: new Date().toISOString() },
        ];
        const nextStatus = ticket.status === 'open' ? 'acknowledged' : ticket.status;

        const apply = (t: Ticket): Ticket =>
          t.id === ticketId ? { ...t, status: nextStatus, responses: nextResponses } : t;

        if (isSeed(propertyId)) {
          set((s) => ({
            tickets: s.tickets.map(apply),
            seedData: { ...s.seedData, tickets: s.seedData.tickets.map(apply) },
          }));
        } else {
          set((s) => ({ tickets: s.tickets.map(apply) }));
          await updateTicket(ticketId, { status: nextStatus, responses: nextResponses });
        }
      },

      setTicketStatus: async (ticketId, status) => {
        const propertyId = get().activePropertyId;
        const apply = (t: Ticket): Ticket => (t.id === ticketId ? { ...t, status } : t);
        if (isSeed(propertyId)) {
          set((s) => ({
            tickets: s.tickets.map(apply),
            seedData: { ...s.seedData, tickets: s.seedData.tickets.map(apply) },
          }));
        } else {
          set((s) => ({ tickets: s.tickets.map(apply) }));
          await updateTicket(ticketId, { status });
        }
      },

      addTimelineEvent: async (e) => {
        const propertyId = get().activePropertyId;
        if (!propertyId) return;
        const at = e.at ?? new Date().toISOString();
        if (isSeed(propertyId)) {
          const event: TimelineEvent = { id: genId('tl'), propertyId, at, ...e };
          set((s) => ({
            timeline: [event, ...s.timeline],
            seedData: { ...s.seedData, timeline: [event, ...s.seedData.timeline] },
          }));
        } else {
          const saved = await insertTimelineEvent(propertyId, { ...e, at });
          if (saved) set((s) => ({ timeline: [saved, ...s.timeline] }));
        }
      },

      createInspection: async (kind) => {
        const propertyId = get().activePropertyId;
        if (!propertyId) return null;
        if (isSeed(propertyId)) {
          const id = genId('insp');
          const inspection: Inspection = {
            id,
            propertyId,
            kind,
            createdAt: new Date().toISOString(),
            photos: [],
          };
          set((s) => ({
            inspections: [inspection, ...s.inspections],
            seedData: { ...s.seedData, inspections: [inspection, ...s.seedData.inspections] },
          }));
          return id;
        }
        const saved = await insertInspection(propertyId, kind);
        if (!saved) return null;
        set((s) => ({ inspections: [saved, ...s.inspections] }));
        return saved.id;
      },

      addInspectionPhoto: async (inspectionId, room, uri, damages) => {
        const propertyId = get().activePropertyId;
        const insp = get().inspections.find((i) => i.id === inspectionId);
        if (!insp) return;
        const photo: InspectionPhoto = {
          id: genId('photo'),
          room,
          uri,
          capturedAt: new Date().toISOString(),
          damages,
        };
        const nextPhotos = [...insp.photos, photo];
        const apply = (i: Inspection): Inspection =>
          i.id === inspectionId ? { ...i, photos: nextPhotos } : i;

        if (isSeed(propertyId)) {
          set((s) => ({
            inspections: s.inspections.map(apply),
            seedData: { ...s.seedData, inspections: s.seedData.inspections.map(apply) },
          }));
        } else {
          set((s) => ({ inspections: s.inspections.map(apply) }));
          await updateInspection(inspectionId, { photos: nextPhotos });
        }
      },

      signInspection: async (inspectionId, signedBy) => {
        const propertyId = get().activePropertyId;
        const insp = get().inspections.find((i) => i.id === inspectionId);
        if (!insp) return;
        const signedAt = new Date().toISOString();
        const apply = (i: Inspection): Inspection =>
          i.id === inspectionId ? { ...i, signedAt, signedBy } : i;

        if (isSeed(propertyId)) {
          set((s) => ({
            inspections: s.inspections.map(apply),
            seedData: { ...s.seedData, inspections: s.seedData.inspections.map(apply) },
          }));
        } else {
          set((s) => ({ inspections: s.inspections.map(apply) }));
          await updateInspection(inspectionId, { signedAt, signedBy });
        }

        await get().addTimelineEvent({
          type: insp.kind === 'move_in' ? 'move_in' : 'move_out',
          title: insp.kind === 'move_in' ? 'Signed move-in report' : 'Signed move-out report',
          detail: `${insp.photos.length} rooms documented · signed by ${signedBy}`,
          actor: get().role,
        });
      },
    }),
    {
      name: 'tenancyos-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        property: s.property,
        seedData: s.seedData,
      }),
      onRehydrateStorage: () => () => {
        // Auth hydration (and the `hydrated` flag) is owned by initAuth() in _layout.
      },
    }
  )
);
