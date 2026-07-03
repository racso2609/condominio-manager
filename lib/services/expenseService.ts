import { supabase } from "@/lib/supabase";
import { Expense } from "@/lib/types";

const TABLE = "expenses";

function generateId(): string {
  return crypto.randomUUID();
}

export async function createExpense(data: {
  condominium?: string;
  building?: string;
  title: string;
  description?: string;
  amount: number;
  due_date: Date;
  period_start?: Date;
  period_end?: Date;
}): Promise<Expense> {
  const now = new Date().toISOString();
  const id = generateId();
  const expenseData = {
    id,
    condominium: data.condominium ?? null,
    building: data.building ?? null,
    title: data.title,
    description: data.description ?? null,
    amount: data.amount,
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
  if (data.amount !== undefined) updateData.amount = data.amount;
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

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
