export interface AppUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document_id?: string | null;
  notes?: string | null;
  is_preregistered?: boolean;
  role: "admin" | "user" | "administrator";
  photoURL?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Condominium {
  id: string;
  name: string;
  address: string;
  creator: string;
  status: "draft" | "complete";
  created_at: string;
  updated_at: string;
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
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  condominium: string;
  name: string;
  symbol: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  building: string;
  num: string;
  floor: number;
  type: "residential" | "office";
  owner: string | null;
  owner_status?: "pending" | "verified";
  claim_blocked_until?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
}

export type ExpenseStatus = "active" | "cancelled";

export interface Expense {
  id: string;
  condominium?: string;
  building?: string;
  title: string;
  description?: string;
  amount: number;
  items?: ExpenseItem[];
  due_date: string;
  period_start?: string;
  period_end?: string;
  status?: ExpenseStatus;
  deleted_at?: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseEntry {
  id: string;
  expense: string;
  unit: string;
  amount: number;
  status: "pending" | "pending_validation" | "paid" | "overdue";
  paid_at: string | null;
  payment_method_id?: string | null;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
  notes?: string | null;
  reported_by?: string | null;
  reported_at?: string | null;
  validated_by?: string | null;
  validated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedExpenseEntries {
  entries: (ExpenseEntry & { units?: Unit })[];
  totalCount: number;
  totalPages: number;
  page: number;
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}
