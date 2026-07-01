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
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Expense } from "@/lib/types";

const COLLECTION = "expenses";

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
  const now = Timestamp.now();
  const ref = doc(collection(db, COLLECTION));
  const expenseData = {
    condominium: data.condominium ?? null,
    building: data.building ?? null,
    title: data.title,
    description: data.description ?? null,
    amount: data.amount,
    due_date: Timestamp.fromDate(data.due_date),
    period_start: data.period_start ? Timestamp.fromDate(data.period_start) : null,
    period_end: data.period_end ? Timestamp.fromDate(data.period_end) : null,
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref, expenseData);
  return { id: ref.id, ...expenseData } as unknown as Expense;
}

export async function getExpense(id: string): Promise<Expense | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Expense;
}

export async function getExpensesByCondominium(
  condominiumId: string
): Promise<Expense[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("condominium", "==", condominiumId),
      orderBy("created_at", "desc")
    )
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
}

export async function getExpensesByBuilding(
  buildingId: string
): Promise<Expense[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("building", "==", buildingId),
      orderBy("created_at", "desc")
    )
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
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
  const updateData: Record<string, unknown> = { updated_at: Timestamp.now() };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.due_date !== undefined) updateData.due_date = Timestamp.fromDate(data.due_date);
  if (data.period_start !== undefined) updateData.period_start = Timestamp.fromDate(data.period_start);
  if (data.period_end !== undefined) updateData.period_end = Timestamp.fromDate(data.period_end);
  await updateDoc(doc(db, COLLECTION, id), updateData);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
