import { Timestamp } from "firebase/firestore";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "user" | "administrator";
  photoURL?: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Condominium {
  id: string;
  name: string;
  address: string;
  creator: string;
  status: "draft" | "complete";
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CondominiumRole {
  id: string;
  condominium: string;
  user: string;
  role: "administrator" | "resident";
  status: "pending" | "verified";
  invited_email?: string;
  invited_by?: string;
  token?: string;
  expires_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Building {
  id: string;
  condominium: string;
  name: string;
  symbol: string;
  address?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Unit {
  id: string;
  building: string;
  num: string;
  floor: number;
  type: "residential" | "office";
  owner: string;
  owner_status?: "pending" | "verified";
  claim_blocked_until?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Expense {
  id: string;
  condominium?: string;
  building?: string;
  title: string;
  description?: string;
  amount: number;
  due_date: Timestamp;
  period_start?: Timestamp;
  period_end?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ExpenseEntry {
  id: string;
  expense: string;
  unit: string;
  amount: number;
  status: "pending" | "pending_validation" | "paid" | "overdue";
  paid_at: Timestamp | null;
  payment_method_id?: string | null;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
  notes?: string | null;
  reported_by?: string | null;
  reported_at?: Timestamp | null;
  validated_by?: string | null;
  validated_at?: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AnnouncementFile {
  name: string;
  url: string;
  type: "image" | "document";
}

export interface Announcement {
  id: string;
  condominium: string;
  title: string;
  content: string;
  files?: AnnouncementFile[];
  author: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type PaymentMethodType =
  | "bank_transfer"
  | "mobile_payment"
  | "zelle"
  | "paypal"
  | "venmo"
  | "cash"
  | "other";

export interface PaymentMethod {
  id: string;
  condominium: string;
  name: string;
  type: PaymentMethodType;
  holder_name?: string;
  bank_name?: string;
  account_number?: string;
  routing_number?: string;
  phone?: string;
  email?: string;
  identification?: string;
  notes?: string;
  is_default: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type ComplaintStatus = "pending" | "in_progress" | "resolved";

export interface ComplaintFile {
  name: string;
  url: string;
  type: "image" | "document";
}

export interface Complaint {
  id: string;
  condominium: string;
  title: string;
  content: string;
  files?: ComplaintFile[];
  author: string;
  status: ComplaintStatus;
  resolution_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
