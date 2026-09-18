import { supabase } from "@/lib/supabase";
import { generateStorageFileName } from "@/lib/utils/storage";
import { ExpenseEntry, PaginatedExpenseEntries } from "@/lib/types";

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

export async function getEntriesByExpenseAndBuilding(
  expenseId: string,
  buildingId: string,
  page = 1,
  pageSize = 10,
  search?: string
): Promise<PaginatedExpenseEntries> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const trimmed = search?.trim();
  const safe = trimmed
    ? trimmed.replace(/[,()%"'\\]/g, " ").replace(/\s+/g, " ").trim()
    : "";
  const cleaned = safe
    ? safe
        .replace(
          /^(apto\.?|apartamento|unidad|depto\.?|recibo\s*#?|ref\.?|#)\s*/i,
          ""
        )
        .trim()
    : "";

  let matchedUnitIds: string[] = [];
  let matchedUserIds: string[] = [];

  if (safe.length > 0) {
    const unitNumQuery = supabase
      .from("units")
      .select("id")
      .eq("building", buildingId)
      .ilike("num", `%${cleaned || safe}%`);

    const userQuery = supabase
      .from("users")
      .select("id")
      .or(
        `name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`
      );

    const [unitsNumRes, usersRes] = await Promise.all([
      unitNumQuery,
      userQuery,
    ]);

    if (unitsNumRes.error) throw unitsNumRes.error;
    if (usersRes.error) throw usersRes.error;

    matchedUserIds = (usersRes.data ?? []).map((u) => u.id);

    let matchedUnitsByOwner: { id: string }[] = [];
    if (matchedUserIds.length > 0) {
      const { data: unitsByOwner, error: ownerUnitsError } = await supabase
        .from("units")
        .select("id")
        .eq("building", buildingId)
        .in("owner", matchedUserIds);

      if (ownerUnitsError) throw ownerUnitsError;
      matchedUnitsByOwner = unitsByOwner ?? [];
    }

    matchedUnitIds = Array.from(
      new Set([
        ...(unitsNumRes.data ?? []).map((u) => u.id),
        ...matchedUnitsByOwner.map((u) => u.id),
      ])
    );
  }

  let query = supabase
    .from(TABLE)
    .select("*, units!inner(*, owner_user:users(*))", { count: "exact" })
    .eq("expense", expenseId)
    .eq("units.building", buildingId);

  if (safe.length > 0) {
    const orClauses: string[] = [
      `payment_reference.ilike.%${safe}%`,
      `notes.ilike.%${safe}%`,
      `id.ilike.%${cleaned || safe}%`,
    ];

    if (cleaned && cleaned !== safe) {
      orClauses.push(`payment_reference.ilike.%${cleaned}%`);
      orClauses.push(`notes.ilike.%${cleaned}%`);
    }

    if (matchedUnitIds.length > 0) {
      orClauses.push(`unit.in.(${matchedUnitIds.join(",")})`);
    }

    if (matchedUserIds.length > 0) {
      orClauses.push(`reported_by.in.(${matchedUserIds.join(",")})`);
    }

    query = query.or(orClauses.join(","));
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) throw error;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    entries: (data ?? []) as unknown as PaginatedExpenseEntries["entries"],
    totalCount,
    totalPages,
    page,
  };
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

