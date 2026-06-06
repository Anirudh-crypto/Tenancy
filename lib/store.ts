import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { genId, triageTicket } from './ai';
import { fetchProfile, supabase } from './supabase';
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

const SEED_PROPERTY: Property = {
  id: 'prop_1',
  name: 'Altbau · 3 Zimmer',
  address: 'Schönhauser Allee 142',
  city: 'Berlin',
  rent: 1180,
  deposit: 3540,
  tenantName: 'Lena Hoffmann',
  landlordName: 'M. Becker Immobilien',
  moveInDate: iso(420),
};

const SEED_TIMELINE: TimelineEvent[] = [
  { id: 't1', type: 'move_in', title: 'Move-in completed', detail: 'Signed move-in report with 6 documented pre-existing items.', at: iso(420), actor: 'system' },
  { id: 't2', type: 'agreement', title: 'House rules acknowledged', detail: 'Quiet hours 22:00–06:00, shared cleaning rota agreed.', at: iso(418), actor: 'tenant' },
  { id: 't3', type: 'maintenance', title: 'Dishwasher not draining', detail: 'Reported and resolved within 5 days.', at: iso(300), actor: 'tenant' },
  { id: 't4', type: 'inspection', title: 'Annual inspection visit', detail: 'No issues noted. Photos archived.', at: iso(180), actor: 'landlord' },
  { id: 't5', type: 'maintenance', title: 'Mold spots in bathroom', detail: 'Reported. Ventilation advice given, not yet remediated.', at: iso(60), actor: 'tenant' },
  { id: 't6', type: 'maintenance', title: 'Mold spots returned', detail: 'Second report of mold in same location.', at: iso(12), actor: 'tenant' },
];

const SEED_TICKETS: Ticket[] = [
  {
    id: 'tkt_seed_1',
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
    title: 'High probability of moisture damage within 6 months',
    level: 'high',
    category: 'moisture',
    rationale: 'Mold reported twice in the bathroom (60 and 12 days ago). Ventilation issue remains unresolved.',
    recommendation: 'Schedule professional remediation and a humidity assessment before it spreads to structural elements.',
  },
  {
    id: 'risk_2',
    title: 'Deposit dispute risk: Medium',
    level: 'medium',
    category: 'deposit',
    rationale: 'Unresolved mold could be wrongly attributed to the tenant at move-out.',
    recommendation: 'Keep the move-in report and all mold reports timestamped to establish landlord responsibility.',
  },
];

interface State {
  property: Property;
  tickets: Ticket[];
  timeline: TimelineEvent[];
  inspections: Inspection[];
  risks: RiskSignal[];
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
  }) => Promise<{ ok: true; needsVerification: boolean } | { ok: false; error: string }>;
  verifySignup: (
    email: string,
    token: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  resendSignupCode: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  requestPasswordReset: (
    email: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  verifyPasswordReset: (
    email: string,
    token: string,
    newPassword: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;

  setRole: (r: 'tenant' | 'landlord') => void;
  addTicket: (input: { title: string; description: string }) => Ticket;
  respondToTicket: (ticketId: string, text: string) => void;
  setTicketStatus: (ticketId: string, status: Ticket['status']) => void;
  addTimelineEvent: (e: Omit<TimelineEvent, 'id' | 'at'> & { at?: string }) => void;

  createInspection: (kind: InspectionKind) => string;
  addInspectionPhoto: (
    inspectionId: string,
    room: RoomKey,
    uri: string,
    damages: DetectedDamage[]
  ) => void;
  signInspection: (inspectionId: string, signedBy: string) => void;
}

function timelineForTicket(t: Ticket): Omit<TimelineEvent, 'id' | 'at'> {
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
      tickets: SEED_TICKETS,
      timeline: SEED_TIMELINE,
      inspections: [],
      risks: SEED_RISKS,
      role: 'tenant',
      hydrated: false,

      user: null,

      initAuth: async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const session = data.session;
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (profile) {
              set({ user: profile, role: profile.role });
            }
          }
        } catch {
          // ignore — treated as signed out
        } finally {
          set({ hydrated: true });
        }

        // Keep store in sync with auth state changes (token refresh, sign out, etc.)
        supabase.auth.onAuthStateChange((_event, session) => {
          if (!session?.user) {
            set({ user: null });
            return;
          }
          void (async () => {
            const profile = await fetchProfile(session.user.id);
            if (profile) set({ user: profile, role: profile.role });
          })();
        });
      },

      signIn: async (email, password) => {
        const normalized = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (error || !data.user) {
          return { ok: false, error: error?.message ?? 'Invalid email or password.' };
        }
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          set({ user: profile, role: profile.role });
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
        if (error) {
          return { ok: false, error: error.message };
        }
        // If email confirmation is required, there is no active session yet.
        const needsVerification = !data.session;
        if (data.session && data.user) {
          const profile = await fetchProfile(data.user.id);
          if (profile) set({ user: profile, role: profile.role });
        }
        return { ok: true, needsVerification };
      },

      verifySignup: async (email, token) => {
        const normalized = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.verifyOtp({
          email: normalized,
          token: token.trim(),
          type: 'signup',
        });
        if (error || !data.user) {
          return { ok: false, error: error?.message ?? 'Invalid or expired code.' };
        }
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          set({ user: profile, role: profile.role });
        }
        return { ok: true };
      },

      resendSignupCode: async (email) => {
        const normalized = email.trim().toLowerCase();
        const { error } = await supabase.auth.resend({ type: 'signup', email: normalized });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },

      requestPasswordReset: async (email) => {
        const normalized = email.trim().toLowerCase();
        if (!normalized.includes('@')) {
          return { ok: false, error: 'Enter a valid email address.' };
        }
        // Sends a 6-digit recovery code (no redirect link).
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
        set({ user: null });
      },

      setRole: (role) => set({ role }),

      addTicket: ({ title, description }) => {
        const triage = triageTicket(`${title} ${description}`);
        const ticket: Ticket = {
          id: genId('tkt'),
          title,
          description,
          category: triage.category,
          urgency: triage.urgency,
          status: 'open',
          createdAt: new Date().toISOString(),
          reporter: get().role,
          legalDeadline: triage.legalDeadline,
          legalNote: triage.legalNote,
          responses: [],
        };
        set((s) => ({ tickets: [ticket, ...s.tickets] }));
        get().addTimelineEvent(timelineForTicket(ticket));
        return ticket;
      },

      respondToTicket: (ticketId, text) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: t.status === 'open' ? 'acknowledged' : t.status,
                  responses: [
                    ...t.responses,
                    { id: genId('resp'), author: s.role, text, at: new Date().toISOString() },
                  ],
                }
              : t
          ),
        })),

      setTicketStatus: (ticketId, status) =>
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, status } : t)),
        })),

      addTimelineEvent: (e) =>
        set((s) => ({
          timeline: [
            { id: genId('tl'), at: e.at ?? new Date().toISOString(), ...e },
            ...s.timeline,
          ],
        })),

      createInspection: (kind) => {
        const id = genId('insp');
        const inspection: Inspection = {
          id,
          kind,
          createdAt: new Date().toISOString(),
          photos: [],
        };
        set((s) => ({ inspections: [inspection, ...s.inspections] }));
        return id;
      },

      addInspectionPhoto: (inspectionId, room, uri, damages) =>
        set((s) => ({
          inspections: s.inspections.map((i) =>
            i.id === inspectionId
              ? {
                  ...i,
                  photos: [
                    ...i.photos,
                    {
                      id: genId('photo'),
                      room,
                      uri,
                      capturedAt: new Date().toISOString(),
                      damages,
                    } as InspectionPhoto,
                  ],
                }
              : i
          ),
        })),

      signInspection: (inspectionId, signedBy) => {
        const insp = get().inspections.find((i) => i.id === inspectionId);
        set((s) => ({
          inspections: s.inspections.map((i) =>
            i.id === inspectionId
              ? { ...i, signedAt: new Date().toISOString(), signedBy }
              : i
          ),
        }));
        if (insp) {
          get().addTimelineEvent({
            type: insp.kind === 'move_in' ? 'move_in' : 'move_out',
            title:
              insp.kind === 'move_in'
                ? 'Signed move-in report'
                : 'Signed move-out report',
            detail: `${insp.photos.length} rooms documented · signed by ${signedBy}`,
            actor: get().role,
          });
        }
      },
    }),
    {
      name: 'tenancyos-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        property: s.property,
        tickets: s.tickets,
        timeline: s.timeline,
        inspections: s.inspections,
        risks: s.risks,
      }),
      onRehydrateStorage: () => () => {
        // Auth hydration (and the `hydrated` flag) is owned by initAuth() in _layout.
      },
    }
  )
);
