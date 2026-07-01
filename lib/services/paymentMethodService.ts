import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase";
import { PaymentMethod, PaymentMethodType } from "@/lib/types";

const COLLECTION = "payment_methods";

export interface CreatePaymentMethodInput {
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
  is_default?: boolean;
}

export async function createPaymentMethod(
  data: CreatePaymentMethodInput
): Promise<PaymentMethod> {
  const now = Timestamp.now();
  const ref = doc(collection(db, COLLECTION));
  const paymentMethodData = {
    condominium: data.condominium,
    name: data.name.trim(),
    type: data.type,
    holder_name: data.holder_name?.trim() ?? null,
    bank_name: data.bank_name?.trim() ?? null,
    account_number: data.account_number?.trim() ?? null,
    routing_number: data.routing_number?.trim() ?? null,
    phone: data.phone?.trim() ?? null,
    email: data.email?.trim() ?? null,
    identification: data.identification?.trim() ?? null,
    notes: data.notes?.trim() ?? null,
    is_default: data.is_default ?? false,
    created_at: now,
    updated_at: now,
  };

  if (paymentMethodData.is_default) {
    await unsetDefaultPaymentMethods(data.condominium);
  }

  await setDoc(ref, paymentMethodData);
  return { id: ref.id, ...paymentMethodData } as unknown as PaymentMethod;
}

export async function getPaymentMethod(id: string): Promise<PaymentMethod | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PaymentMethod;
}

export async function getPaymentMethodsByCondominium(
  condominiumId: string
): Promise<PaymentMethod[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("condominium", "==", condominiumId),
      orderBy("created_at", "desc")
    )
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentMethod);
}

export async function updatePaymentMethod(
  id: string,
  condominiumId: string,
  data: Partial<CreatePaymentMethodInput>
): Promise<void> {
  const updateData: Record<string, unknown> = { updated_at: Timestamp.now() };

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.type !== undefined) updateData.type = data.type;
  if (data.holder_name !== undefined)
    updateData.holder_name = data.holder_name.trim() || null;
  if (data.bank_name !== undefined)
    updateData.bank_name = data.bank_name.trim() || null;
  if (data.account_number !== undefined)
    updateData.account_number = data.account_number.trim() || null;
  if (data.routing_number !== undefined)
    updateData.routing_number = data.routing_number.trim() || null;
  if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
  if (data.email !== undefined) updateData.email = data.email.trim() || null;
  if (data.identification !== undefined)
    updateData.identification = data.identification.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes.trim() || null;
  if (data.is_default !== undefined) updateData.is_default = data.is_default;

  if (data.is_default) {
    await unsetDefaultPaymentMethods(condominiumId, id);
  }

  await updateDoc(doc(db, COLLECTION, id), updateData);
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

async function unsetDefaultPaymentMethods(
  condominiumId: string,
  excludeId?: string
): Promise<void> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("condominium", "==", condominiumId),
      where("is_default", "==", true)
    )
  );

  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    if (d.id !== excludeId) {
      batch.update(doc(db, COLLECTION, d.id), {
        is_default: false,
        updated_at: Timestamp.now(),
      });
    }
  });
  await batch.commit();
}
