import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  documentId,
  Timestamp,
  setDoc,
  updateDoc,
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

  await setDoc(doc(collection(db, ROLE_COLLECTION)), {
    condominium: ref.id,
    user: data.creator,
    role: "administrator",
    status: "verified",
    created_at: now,
    updated_at: now,
  });

  return { id: ref.id, ...condoData };
}

export async function getCondominiumRoles(condominiumId: string): Promise<CondominiumRole[]> {
  const snapshot = await getDocs(
    query(collection(db, ROLE_COLLECTION), where("condominium", "==", condominiumId))
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CondominiumRole));
}

function generateToken(): string {
  return crypto.randomUUID();
}

export async function createInvite(
  condominiumId: string,
  invitedBy: string,
  email: string,
): Promise<CondominiumRole> {
  const now = Timestamp.now();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const ref = doc(collection(db, ROLE_COLLECTION));
  const roleData = {
    condominium: condominiumId,
    user: "",
    role: "resident" as const,
    status: "pending" as const,
    invited_email: email,
    invited_by: invitedBy,
    token: generateToken(),
    expires_at: Timestamp.fromDate(expiresAt),
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref, roleData);
  return { id: ref.id, ...roleData };
}

export async function createGlobalInvite(
  condominiumId: string,
  invitedBy: string,
): Promise<CondominiumRole> {
  const now = Timestamp.now();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const ref = doc(collection(db, ROLE_COLLECTION));
  const roleData = {
    condominium: condominiumId,
    user: "",
    role: "resident" as const,
    status: "pending" as const,
    invited_by: invitedBy,
    token: generateToken(),
    expires_at: Timestamp.fromDate(expiresAt),
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref, roleData);
  return { id: ref.id, ...roleData };
}

export async function getInviteByToken(token: string): Promise<CondominiumRole | null> {
  const snapshot = await getDocs(
    query(collection(db, ROLE_COLLECTION), where("token", "==", token))
  );
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as CondominiumRole;
}

export async function acceptInvite(token: string, userId: string): Promise<CondominiumRole> {
  const role = await getInviteByToken(token);
  if (!role) throw new Error("Invitación no encontrada");
  if (role.expires_at && role.expires_at.toMillis() < Date.now())
    throw new Error("Invitación expirada");
  if (role.user)
    throw new Error("Invitación ya fue aceptada");

  const ref = doc(db, ROLE_COLLECTION, role.id);
  await updateDoc(ref, { user: userId, updated_at: Timestamp.now() });
  return { ...role, user: userId, updated_at: Timestamp.now() };
}

export async function getPendingInvitesByEmail(email: string): Promise<CondominiumRole[]> {
  const snapshot = await getDocs(
    query(
      collection(db, ROLE_COLLECTION),
      where("invited_email", "==", email),
      where("user", "==", ""),
    )
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CondominiumRole));
}

export async function getPendingRoles(condominiumId: string): Promise<CondominiumRole[]> {
  const snapshot = await getDocs(
    query(
      collection(db, ROLE_COLLECTION),
      where("condominium", "==", condominiumId),
      where("status", "==", "pending"),
    )
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CondominiumRole));
}

export async function verifyRole(roleId: string): Promise<void> {
  await updateDoc(doc(db, ROLE_COLLECTION, roleId), {
    status: "verified",
    updated_at: Timestamp.now(),
  });
}

export async function deleteCondominiumRole(roleId: string): Promise<void> {
  await deleteDoc(doc(db, ROLE_COLLECTION, roleId));
}

export async function updateCondominiumStatus(
  id: string,
  status: "draft" | "complete",
): Promise<void> {
  await updateDoc(doc(db, CONDO_COLLECTION, id), {
    status,
    updated_at: Timestamp.now(),
  });
}
