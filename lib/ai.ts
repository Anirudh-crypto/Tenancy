import type {
  DetectedDamage,
  DamageSeverity,
  RoomKey,
  Ticket,
  Urgency,
} from './types';

const ROOM_LABELS: Record<RoomKey, string> = {
  living: 'Living room',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  hallway: 'Hallway',
} as const;

export const ROOMS: { key: RoomKey; label: string }[] = (
  Object.keys(ROOM_LABELS) as RoomKey[]
).map((key) => ({ key, label: ROOM_LABELS[key] }));

export function roomLabel(room: RoomKey): string {
  return ROOM_LABELS[room];
}

// --- Mock AI: damage detection for an inspection photo ---
// Deterministic-ish "vision model" that returns plausible findings per room.
const DAMAGE_LIBRARY: Record<RoomKey, Omit<DetectedDamage, 'id' | 'room'>[]> = {
  living: [
    { label: 'Wall scuff near door', severity: 'wear', confidence: 0.91, estimatedCost: 0 },
    { label: 'Parquet scratch', severity: 'minor', confidence: 0.78, estimatedCost: 80 },
    { label: 'Faded paint by window', severity: 'wear', confidence: 0.84, estimatedCost: 0 },
  ],
  kitchen: [
    { label: 'Worktop burn mark', severity: 'major', confidence: 0.88, estimatedCost: 240 },
    { label: 'Chipped tile', severity: 'minor', confidence: 0.72, estimatedCost: 45 },
    { label: 'Grease residue', severity: 'wear', confidence: 0.69, estimatedCost: 0 },
  ],
  bathroom: [
    { label: 'Mold spots on grout', severity: 'major', confidence: 0.93, estimatedCost: 180, note: 'Recurring moisture pattern detected' },
    { label: 'Silicone discoloration', severity: 'wear', confidence: 0.81, estimatedCost: 0 },
    { label: 'Cracked sink edge', severity: 'minor', confidence: 0.64, estimatedCost: 90 },
  ],
  bedroom: [
    { label: 'Nail holes in wall', severity: 'wear', confidence: 0.87, estimatedCost: 0 },
    { label: 'Carpet stain', severity: 'minor', confidence: 0.7, estimatedCost: 120 },
    { label: 'Window seal gap', severity: 'minor', confidence: 0.66, estimatedCost: 60 },
  ],
  hallway: [
    { label: 'Scuffed baseboard', severity: 'wear', confidence: 0.83, estimatedCost: 0 },
    { label: 'Light switch crack', severity: 'minor', confidence: 0.61, estimatedCost: 35 },
  ],
};

let _seq = 0;
function uid(prefix: string): string {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq}`;
}

export function analyzePhoto(room: RoomKey): DetectedDamage[] {
  const lib = DAMAGE_LIBRARY[room];
  // pick 1-2 findings
  const count = 1 + Math.round(Math.random());
  const shuffled = [...lib].toSorted(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((d) => ({ ...d, id: uid('dmg'), room }));
}

export const SEVERITY_META: Record<
  DamageSeverity,
  { label: string; tone: 'success' | 'warning' | 'destructive' }
> = {
  wear: { label: 'Normal wear', tone: 'success' },
  minor: { label: 'Minor damage', tone: 'warning' },
  major: { label: 'Significant damage', tone: 'destructive' },
};

// --- Mock AI: maintenance ticket triage ---
const KEYWORDS: { match: RegExp; category: string; urgency: Urgency; days: number; note: string }[] = [
  {
    match: /heat|heizung|boiler|hot water|warmwasser/i,
    category: 'Heating',
    urgency: 'high',
    days: 3,
    note: 'In Germany, loss of heating in cold months can justify rent reduction (Mietminderung). Landlord must act promptly.',
  },
  {
    match: /leak|water|flood|burst|wasser|rohrbruch/i,
    category: 'Plumbing',
    urgency: 'emergency',
    days: 1,
    note: 'Active water damage is an emergency. Landlord must respond within 24h to limit further damage.',
  },
  {
    match: /mold|mould|schimmel|damp|moisture|feucht/i,
    category: 'Moisture / Mold',
    urgency: 'high',
    days: 7,
    note: 'Mold can be a health hazard and grounds for Mietminderung. Document thoroughly and notify landlord in writing.',
  },
  {
    match: /electric|power|socket|strom|wiring|spark/i,
    category: 'Electrical',
    urgency: 'emergency',
    days: 1,
    note: 'Electrical faults pose a safety risk. Treat as urgent.',
  },
  {
    match: /window|door|lock|fenster|schloss/i,
    category: 'Security / Fixtures',
    urgency: 'medium',
    days: 14,
    note: 'Repair should be scheduled within a reasonable timeframe.',
  },
];

export function triageTicket(text: string): {
  category: string;
  urgency: Urgency;
  legalDeadline: string;
  legalNote: string;
} {
  const hit = KEYWORDS.find((k) => k.match.test(text));
  const days = hit?.days ?? 14;
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);
  return {
    category: hit?.category ?? 'General',
    urgency: hit?.urgency ?? 'low',
    legalDeadline: deadline.toISOString(),
    legalNote:
      hit?.note ??
      'Notify the landlord in writing and allow a reasonable period for repair (typically 14 days).',
  };
}

export const URGENCY_META: Record<
  Urgency,
  { label: string; tone: 'destructive' | 'warning' | 'primary' | 'muted' }
> = {
  emergency: { label: 'Emergency', tone: 'destructive' },
  high: { label: 'High', tone: 'warning' },
  medium: { label: 'Medium', tone: 'primary' },
  low: { label: 'Low', tone: 'muted' },
};

export function newTicketId(): string {
  return uid('tkt');
}
export function genId(prefix = 'id'): string {
  return uid(prefix);
}

// --- Mock AI: deposit recommendation from move-in vs move-out ---
export function computeDepositRecommendation(
  moveOutDamages: DetectedDamage[],
  deposit: number
): {
  wearTotal: number;
  damageTotal: number;
  recommendedDeduction: number;
  recommendedReturn: number;
  summary: string;
} {
  const wearTotal = moveOutDamages
    .filter((d) => d.severity === 'wear')
    .reduce((s, d) => s + d.estimatedCost, 0);
  const damageTotal = moveOutDamages
    .filter((d) => d.severity !== 'wear')
    .reduce((s, d) => s + d.estimatedCost, 0);
  const recommendedDeduction = Math.min(damageTotal, deposit);
  const recommendedReturn = Math.max(deposit - recommendedDeduction, 0);
  const summary =
    damageTotal === 0
      ? 'No tenant-attributable damage detected beyond normal wear. Full deposit return recommended.'
      : `Normal wear (€${wearTotal}) is the landlord's responsibility and is not deductible under German law. Tenant-attributable damage totals €${damageTotal}.`;
  return { wearTotal, damageTotal, recommendedDeduction, recommendedReturn, summary };
}

// re-export to satisfy ticket typing usage
export type { Ticket };
