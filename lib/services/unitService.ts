import { collection, doc, deleteDoc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore";
import { db } from "@/firebase";
import { Unit } from "@/lib/types";

const COLLECTION = "units";

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
  type: "residential" | "office"
): Promise<Unit[]> {
  const now = Timestamp.now();
  const created: Unit[] = [];

  for (let f = 0; f < floors; f++) {
    for (let u = 0; u < unitsPerFloor; u++) {
      const num = `${String(f).padStart(2, "0")}${String(u + 1).padStart(2, "0")}`;
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
    query(collection(db, COLLECTION), where("building", "==", buildingId))
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Unit);
}

export async function deleteUnit(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
