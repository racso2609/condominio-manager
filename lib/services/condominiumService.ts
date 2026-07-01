import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  documentId,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Condominium, CondominiumRole } from "@/lib/types";

const CONDO_COLLECTION = "condominiums";
const ROLE_COLLECTION = "condominium_roles";

export async function getUserCondominiums(
  userId: string,
  role: string
): Promise<Condominium[]> {
  if (role === "admin") {
    const snapshot = await getDocs(collection(db, CONDO_COLLECTION));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Condominium));
  }

  const rolesSnapshot = await getDocs(
    query(collection(db, ROLE_COLLECTION), where("user", "==", userId))
  );

  if (rolesSnapshot.empty) return [];

  const condominiumIds = rolesSnapshot.docs.map((d) => d.data().condominium);

  if (condominiumIds.length === 0) return [];

  const condoSnapshot = await getDocs(
    query(
      collection(db, CONDO_COLLECTION),
      where(documentId(), "in", condominiumIds)
    )
  );

  return condoSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Condominium));
}

export async function getCondominium(id: string): Promise<Condominium | null> {
  const snap = await getDoc(doc(db, CONDO_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Condominium;
}

export async function createCondominium(data: {
  name: string;
  address: string;
  creator: string;
}): Promise<Condominium> {
  const now = Timestamp.now();
  const ref = doc(collection(db, CONDO_COLLECTION));
  const condoData = {
    name: data.name,
    address: data.address,
    creator: data.creator,
    status: "draft" as const,
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref, condoData);
  return { id: ref.id, ...condoData };
}

export async function getCondominiumRoles(condominiumId: string): Promise<CondominiumRole[]> {
  const snapshot = await getDocs(
    query(collection(db, ROLE_COLLECTION), where("condominium", "==", condominiumId))
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CondominiumRole));
}
