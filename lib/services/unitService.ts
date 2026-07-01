import {
  collection,
  doc,
  deleteDoc,
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
  offset: number = 1,
  prefix: string = "",
  suffix: string = "",
): string {
  const num = `${floor + 1}${index + 1}`;
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
  offset: number = 1,
  prefix: string = "",
  suffix: string = "",
): Promise<Unit[]> {
  const now = Timestamp.now();
  const created: Unit[] = [];

  for (let f = 0; f < floors; f++) {
    for (let u = 0; u < unitsPerFloor; u++) {
      const num = getUnitNumber(f, u, offset, prefix, suffix);
      const ref = doc(collection(db, COLLECTION));
      const unitData = {
        building: buildingId,
        num,
        floor: f,
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
