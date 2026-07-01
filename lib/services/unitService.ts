import {
  collection,
  doc,
  deleteDoc,
  deleteField,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Unit } from "@/lib/types";

const COLLECTION = "units";

export function getUnitNumber(
  floor: number,
  index: number,
  prefix: string = "",
  suffix: string = "",
): string {
  const num = `${floor}${index + 1}`;
  return `${prefix}${num}${suffix}`;
}

export async function createUnit(data: {
  building: string;
  num: string;
  floor: number;
  type: "residential" | "office";
  owner?: string;
}): Promise<Unit> {
  const now = Timestamp.now();
  const ref = doc(collection(db, COLLECTION));
  const unitData = {
    building: data.building,
    num: data.num,
    floor: data.floor,
    type: data.type,
    owner: data.owner ?? "",
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref, unitData);
  return { id: ref.id, ...unitData };
}

export async function generateUnits(
  buildingId: string,
  floors: number,
  unitsPerFloor: number,
  type: "residential" | "office",
  floorOffset: number = 0,
  prefix: string = "",
  suffix: string = "",
): Promise<Unit[]> {
  const now = Timestamp.now();
  const created: Unit[] = [];

  for (let f = 0; f < floors; f++) {
    const actualFloor = f + floorOffset;
    for (let u = 0; u < unitsPerFloor; u++) {
      const num = getUnitNumber(actualFloor, u, prefix, suffix);
      const ref = doc(collection(db, COLLECTION));
      const unitData = {
        building: buildingId,
        num,
        floor: actualFloor,
        type,
        owner: "",
        created_at: now,
        updated_at: now,
      };
      await setDoc(ref, unitData);
      created.push({ id: ref.id, ...unitData });
    }
  }

  return created;
}

export async function getUnitsByBuilding(buildingId: string): Promise<Unit[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("building", "==", buildingId)),
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Unit);
}

export async function getUnit(id: string): Promise<Unit | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Unit;
}

export async function deleteUnit(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateUnitType(
  id: string,
  type: "residential" | "office",
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    type,
    updated_at: Timestamp.now(),
  });
}

export async function claimUnit(unitId: string, userId: string): Promise<void> {
  const snap = await getDoc(doc(db, COLLECTION, unitId));
  if (!snap.exists()) throw new Error("Unidad no encontrada");
  const unit = snap.data() as Unit;
  if (unit.claim_blocked_until && unit.claim_blocked_until.toMillis() > Date.now()) {
    const days = Math.ceil(
      (unit.claim_blocked_until.toMillis() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    throw new Error(
      `Esta unidad fue reclamada recientemente. Intenta de nuevo en ${days} día(s).`
    );
  }
  await updateDoc(doc(db, COLLECTION, unitId), {
    owner: userId,
    owner_status: "pending",
    claim_blocked_until: deleteField(),
    updated_at: Timestamp.now(),
  });
}

export async function rejectUnitClaim(unitId: string): Promise<void> {
  const blockedUntil = new Date();
  blockedUntil.setDate(blockedUntil.getDate() + 7);
  await updateDoc(doc(db, COLLECTION, unitId), {
    owner: "",
    owner_status: deleteField(),
    claim_blocked_until: Timestamp.fromDate(blockedUntil),
    updated_at: Timestamp.now(),
  });
}

export async function verifyUnitOwner(unitId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, unitId), {
    owner_status: "verified",
    updated_at: Timestamp.now(),
  });
}

export async function removeUnitOwner(unitId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, unitId), {
    owner: "",
    owner_status: deleteField(),
    updated_at: Timestamp.now(),
  });
}

export async function getUnitsByOwner(userId: string): Promise<Unit[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("owner", "==", userId))
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Unit);
}

export async function getPendingUnitsByBuilding(buildingId: string): Promise<Unit[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where("building", "==", buildingId),
      where("owner_status", "==", "pending"),
    )
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Unit);
}

export async function getUnitsByOwnerStatus(
  status: "pending" | "verified",
): Promise<Unit[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("owner_status", "==", status))
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Unit);
}
