import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase";
import { ExpenseEntry } from "@/lib/types";

const COLLECTION = "expense_entries";

export async function createExpenseEntry(data: {
  expense: string;
  unit: string;
  amount: number;
  status?: "pending" | "pending_validation" | "paid" | "overdue";
}): Promise<ExpenseEntry> {
  const now = Timestamp.now();
  const ref = doc(collection(db, COLLECTION));
  const entryData = {
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
  await setDoc(ref, entryData);
  return { id: ref.id, ...entryData } as unknown as ExpenseEntry;
}

export async function createExpenseEntries(
  expenseId: string,
  unitAmounts: { unit: string; amount: number }[]
): Promise<ExpenseEntry[]> {
  const now = Timestamp.now();
  const entries: ExpenseEntry[] = [];
  for (const { unit, amount } of unitAmounts) {
    const ref = doc(collection(db, COLLECTION));
    const entryData = {
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
    };
    await setDoc(ref, entryData);
    entries.push({ id: ref.id, ...entryData } as unknown as ExpenseEntry);
  }
  return entries;
}

export async function getExpenseEntry(id: string): Promise<ExpenseEntry | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ExpenseEntry;
}

export async function getEntriesByExpense(
  expenseId: string
): Promise<ExpenseEntry[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("expense", "==", expenseId))
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ExpenseEntry);
}

export async function getEntriesByUnit(
  unitId: string
): Promise<ExpenseEntry[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("unit", "==", unitId))
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ExpenseEntry);
}

export async function getEntriesByUnits(
  unitIds: string[]
): Promise<ExpenseEntry[]> {
  if (unitIds.length === 0) return [];
  const chunkSize = 30;
  const entries: ExpenseEntry[] = [];
  for (let i = 0; i < unitIds.length; i += chunkSize) {
    const chunk = unitIds.slice(i, i + chunkSize);
    const snapshot = await getDocs(
      query(collection(db, COLLECTION), where("unit", "in", chunk))
    );
    entries.push(
      ...snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ExpenseEntry)
    );
  }
  return entries;
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
  const updateData: Record<string, unknown> = {
    status: "pending_validation",
    reported_by: data.reported_by,
    reported_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  };

  if (data.payment_method_id !== undefined) {
    updateData.payment_method_id = data.payment_method_id || null;
  }
  if (data.payment_reference !== undefined) {
    updateData.payment_reference = data.payment_reference.trim() || null;
  }

  if (data.payment_proof) {
    const storageRef = ref(
      storage,
      `payment_proofs/${entryId}/${data.payment_proof.name}`
    );
    await uploadBytes(storageRef, data.payment_proof);
    const url = await getDownloadURL(storageRef);
    updateData.payment_proof_url = url;
  }

  await updateDoc(doc(db, COLLECTION, entryId), updateData);
}

export async function markEntryAsPaid(
  id: string,
  data?: {
    notes?: string;
    validated_by?: string;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status: "paid",
    paid_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  };

  if (data?.notes !== undefined) {
    updateData.notes = data.notes.trim() || null;
  }
  if (data?.validated_by !== undefined) {
    updateData.validated_by = data.validated_by || null;
    updateData.validated_at = Timestamp.now();
  }

  await updateDoc(doc(db, COLLECTION, id), updateData);
}

export async function deleteEntriesByExpense(
  expenseId: string
): Promise<void> {
  const entries = await getEntriesByExpense(expenseId);
  for (const entry of entries) {
    await deleteDoc(doc(db, COLLECTION, entry.id));
  }
}
