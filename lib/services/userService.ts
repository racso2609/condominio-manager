import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, Timestamp, where } from "firebase/firestore";
import { db } from "@/firebase";
import { AppUser } from "@/lib/types";

const COLLECTION = "users";

export async function getUser(id: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}

export async function createUser(
  id: string,
  data: { name: string; email: string; photoURL?: string | null }
): Promise<AppUser> {
  const now = Timestamp.now();
  const userData = {
    name: data.name,
    email: data.email,
    photoURL: data.photoURL ?? null,
    role: "user" as const,
    created_at: now,
    updated_at: now,
  };
  await setDoc(doc(db, COLLECTION, id), userData);
  return { id, ...userData };
}

export async function updateUser(
  id: string,
  data: Partial<Pick<AppUser, "name" | "photoURL" | "role" | "phone">>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { ...data, updated_at: Timestamp.now() });
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("email", "==", email))
  );
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as AppUser;
}
