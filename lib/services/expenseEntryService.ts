import { supabase } from "@/lib/supabase";
import { generateStorageFileName } from "@/lib/utils/storage";
import { ExpenseEntry } from "@/lib/types";

const TABLE = "expense_entries";
const STORAGE_BUCKET = "condominios";

function generateId(): string {
  return crypto.randomUUID();
}

export async function createExpenseEntry(data: {
  expense: string;
  unit: string;
  amount: number;
  status?: "pending" | "pending_validation" | "paid" | "overdue";
}): Promise<ExpenseEntry> {
  const now = new Date().toISOString();
  const id = generateId();
  const entryData = {
    id,
    expense: data.expense,
    unit: data.unit,
    amount: data.amount,
    status: data.status ?? "pending",
    paid_at: null,
    payment_method_id: null,
    payment_reference: null,
    payment_proof_url: null,
    notes: null,
    reported_by: null,
    reported_at: null,
    validated_by: null,
    validated_at: null,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(TABLE).insert(entryData);
  if (error) throw error;

  return entryData as unknown as ExpenseEntry;
}

export async function createExpenseEntries(
  expenseId: string,
  unitAmounts: { unit: string; amount: number }[]
): Promise<ExpenseEntry[]> {
  const now = new Date().toISOString();
  const entries: ExpenseEntry[] = unitAmounts.map(({ unit, amount }) => ({
    id: generateId(),
    expense: expenseId,
    unit,
    amount,
    status: "pending" as const,
    paid_at: null,
    payment_method_id: null,
    payment_reference: null,
    payment_proof_url: null,
    notes: null,
    reported_by: null,
    reported_at: null,
    validated_by: null,
    validated_at: null,
    created_at: now,
    updated_at: now,
  })) as ExpenseEntry[];

  if (entries.length > 0) {
    const { error } = await supabase.from(TABLE).insert(entries);
    if (error) throw error;
  }

  return entries;
}

export async function getExpenseEntry(id: string): Promise<ExpenseEntry | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ExpenseEntry;
}

export async function getEntriesByExpense(
  expenseId: string
): Promise<ExpenseEntry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("expense", expenseId);

  if (error) throw error;
  return (data ?? []) as ExpenseEntry[];
}

export async function getEntriesByUnit(
  unitId: string
): Promise<ExpenseEntry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("unit", unitId);

  if (error) throw error;
  return (data ?? []) as ExpenseEntry[];
}

export async function getEntriesByUnits(
  unitIds: string[]
): Promise<ExpenseEntry[]> {
  if (unitIds.length === 0) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("unit", unitIds);

  if (error) throw error;
  return (data ?? []) as ExpenseEntry[];
}

export async function reportPayment(
  entryId: string,
  data: {
    payment_method_id?: string;
    payment_reference?: string;
    payment_proof?: File;
    reported_by: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    status: "pending_validation",
    reported_by: data.reported_by,
    reported_at: now,
    updated_at: now,
  };

  if (data.payment_method_id !== undefined) {
    updateData.payment_method_id = data.payment_method_id || null;
  }
  if (data.payment_reference !== undefined) {
    updateData.payment_reference = data.payment_reference.trim() || null;
  }

  if (data.payment_proof) {
    const path = `payment_proofs/${entryId}/${generateStorageFileName(data.payment_proof.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, data.payment_proof, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    updateData.payment_proof_url = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from(TABLE).update(updateData).eq("id", entryId);
  if (error) throw error;
}

export async function markEntryAsPaid(
  id: string,
  data?: {
    notes?: string;
    validated_by?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    status: "paid",
    paid_at: now,
    updated_at: now,
  };

  if (data?.notes !== undefined) {
    updateData.notes = data.notes.trim() || null;
  }
  if (data?.validated_by !== undefined) {
    updateData.validated_by = data.validated_by || null;
    updateData.validated_at = now;
  }

  const { error } = await supabase.from(TABLE).update(updateData).eq("id", id);
  if (error) throw error;
}

export async function deleteEntriesByExpense(
  expenseId: string
): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("expense", expenseId);
  if (error) throw error;
}

export async function deleteUnpaidEntriesByExpense(
  expenseId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("expense", expenseId)
    .in("status", ["pending", "overdue"])
    .is("payment_reference", null)
    .is("payment_proof_url", null)
    .is("paid_at", null);

  if (error) throw error;
}

