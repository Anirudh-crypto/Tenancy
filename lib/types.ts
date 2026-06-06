export type Role = 'tenant' | 'landlord';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export type Urgency = 'emergency' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved';
export type RoomKey = 'living' | 'kitchen' | 'bathroom' | 'bedroom' | 'hallway';

export type DamageSeverity = 'wear' | 'minor' | 'major';

export interface DetectedDamage {
  id: string;
  label: string; // e.g. "Wall scratch"
  room: RoomKey;
  severity: DamageSeverity;
  confidence: number; // 0..1
  estimatedCost: number; // EUR, 0 for normal wear
  note?: string;
}

export interface InspectionPhoto {
  id: string;
  room: RoomKey;
  uri: string; // local or placeholder
  capturedAt: string; // ISO
  damages: DetectedDamage[];
}

export type InspectionKind = 'move_in' | 'move_out';

export interface Inspection {
  id: string;
  propertyId: string;
  kind: InspectionKind;
  createdAt: string;
  signedAt?: string;
  signedBy?: string;
  photos: InspectionPhoto[];
}

export interface Ticket {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  category: string; // Heating, Plumbing, Electrical, etc.
  urgency: Urgency;
  status: TicketStatus;
  createdAt: string;
  reporter: 'tenant' | 'landlord';
  legalDeadline?: string; // ISO date by which landlord must act
  legalNote?: string;
  responses: { id: string; author: 'tenant' | 'landlord'; text: string; at: string }[];
}

export type TimelineType =
  | 'rent_increase'
  | 'maintenance'
  | 'repair'
  | 'inspection'
  | 'agreement'
  | 'move_in'
  | 'move_out'
  | 'message';

export interface TimelineEvent {
  id: string;
  propertyId: string;
  type: TimelineType;
  title: string;
  detail: string;
  at: string; // ISO
  actor: 'tenant' | 'landlord' | 'system';
}

export type RiskLevel = 'high' | 'medium' | 'low';

export interface RiskSignal {
  id: string;
  propertyId: string;
  title: string;
  level: RiskLevel;
  rationale: string;
  recommendation: string;
  category: 'moisture' | 'deposit' | 'maintenance' | 'legal';
}

export interface PropertyTenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  moveInDate: string;
  leaseEndDate?: string;
}

export type PropertyStatus = 'occupied' | 'vacant';

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  rent: number;
  deposit: number;
  tenantName: string;
  landlordName: string;
  moveInDate: string;
  // Extended detail fields
  status: PropertyStatus;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number;
  floor?: string;
  tenants: PropertyTenant[];
  notes?: string;
}
