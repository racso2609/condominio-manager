import { supabase } from "@/lib/supabase";
import { Expense, ExpenseItem } from "@/lib/types";
import { deleteUnpaidEntriesByExpense } from "./expenseEntryService";

const TABLE = "expenses";

function generateId(): string {
  return crypto.randomUUID();
}

function calculateTotalFromItems(items?: ExpenseItem[]): number {
  if (!items || items.length === 0) return 0;
  return Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
}

export async function createExpense(data: {
  condominium?: string;
  building?: string;
  title: string;
  description?: string;
  amount?: number;
  items?: ExpenseItem[];
  due_date: Date;
  period_start?: Date;
  period_end?: Date;
}): Promise<Expense> {
  const now = new Date().toISOString();
  const id = generateId();
  const items = data.items && data.items.length > 0
    ? data.items.map((item) => ({
        id: item.id || generateId(),
        description: item.description.trim(),
        amount: Math.round(item.amount * 100) / 100,
      }))
    : [];
  const totalFromItems = calculateTotalFromItems(items);
  const amount = totalFromItems > 0 ? totalFromItems : (data.amount ?? 0);

  const expenseData = {
    id,
    condominium: data.condominium ?? null,
    building: data.building ?? null,
    title: data.title,
    description: data.description ?? null,
    amount,
    items: items.length > 0 ? items : null,
    due_date: data.due_date.toISOString(),
    period_start: data.period_start ? data.period_start.toISOString() : null,
    period_end: data.period_end ? data.period_end.toISOString() : null,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(TABLE).insert(expenseData);
  if (error) throw error;

  return expenseData as unknown as Expense;
}

export async function getExpense(id: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Expense;
}

export async function getExpensesByCondominium(
  condominiumId: string
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function getExpensesByBuilding(
  buildingId: string
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("building", buildingId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function updateExpense(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    amount: number;
    items: ExpenseItem[];
    due_date: Date;
    period_start: Date;
    period_end: Date;
  }>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;

  if (data.items !== undefined) {
    const items = data.items.length > 0
      ? data.items.map((item) => ({
          id: item.id || generateId(),
          description: item.description.trim(),
          amount: Math.round(item.amount * 100) / 100,
        }))
      : [];
    updateData.items = items.length > 0 ? items : null;
    updateData.amount = calculateTotalFromItems(items);
  } else if (data.amount !== undefined) {
    updateData.amount = data.amount;
  }

  if (data.due_date !== undefined) updateData.due_date = data.due_date.toISOString();
  if (data.period_start !== undefined) {
    updateData.period_start = data.period_start.toISOString();
  }
  if (data.period_end !== undefined) {
    updateData.period_end = data.period_end.toISOString();
  }

  const { error } = await supabase.from(TABLE).update(updateData).eq("id", id);
  if (error) throw error;
}

export interface CancelExpenseInput {
  deleted_by: string;
  reason?: string;
}

export async function cancelExpense(
  id: string,
  data: CancelExpenseInput
): Promise<void> {
  const now = new Date().toISOString();
  const reason = data.reason?.trim() || "Eliminado por la administración";

  // 1. Attempt native columns update
  const { error: nativeError } = await supabase
    .from(TABLE)
    .update({
      status: "cancelled",
      deleted_at: now,
      deleted_by: data.deleted_by,
      delete_reason: reason,
      updated_at: now,
    })
    .eq("id", id);

  if (nativeError) {
    // If native columns don't exist yet (e.g. migration 003 hasn't run in Supabase SQL editor):
    // Fall back to annotating the description with structured metadata
    const { data: currentExpense } = await supabase
      .from(TABLE)
      .select("description")
      .eq("id", id)
      .single();

    const tag = `[ANULADO: ${now} | por: ${data.deleted_by} | motivo: ${reason}]`;
    const updatedDesc = currentExpense?.description
      ? `${tag}\n\n${currentExpense.description}`
      : tag;

    const { error: fallbackError } = await supabase
      .from(TABLE)
      .update({
        description: updatedDesc,
        updated_at: now,
      })
      .eq("id", id);

    if (fallbackError) throw fallbackError;
  }

  // 2. Delete all unpaid entries (without payments or payment proofs) to prevent cluttering the database.
  // Entries that were paid or pending_validation (or have proof/reference) are PRESERVED as evidence.
  await deleteUnpaidEntriesByExpense(id);
}

export async function restoreExpense(id: string): Promise<void> {
  const now = new Date().toISOString();

  // Try native column restore
  const { error: nativeError } = await supabase
    .from(TABLE)
    .update({
      status: "active",
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
      updated_at: now,
    })
    .eq("id", id);

  if (nativeError) {
    // Fallback: clean description tag
    const { data: currentExpense } = await supabase
      .from(TABLE)
      .select("description")
      .eq("id", id)
      .single();

    if (currentExpense?.description) {
      const cleanDesc = currentExpense.description
        .replace(/^\[ANULADO:[^\]]*\]\s*/i, "")
        .trim();

      await supabase
        .from(TABLE)
        .update({
          description: cleanDesc || null,
          updated_at: now,
        })
        .eq("id", id);
    }
  }
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

