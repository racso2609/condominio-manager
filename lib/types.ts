import { Timestamp } from "firebase/firestore";

export interface AppUser {
  id: string;
  name: string;
  email: string;
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
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Expense {
  id: string;
  condominium: string;
  title: string;
  description?: string;
  amount: number;
  due_date: Timestamp;
  period_start?: Timestamp;
  period_end?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Announcement {
  id: string;
  condominium: string;
  title: string;
  content: string;
  author: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}
