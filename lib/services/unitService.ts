import { collection, doc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore";
import { db } from "@/firebase";
import { Unit } from "@/lib/types";

const COLLECTION = "units";

export async function createUnit(data: {
  building: string;
  num: string;
  floor: number;
  owner?: string;
}): Promise<Unit> {
  const now = Timestamp.now();
  const ref = doc(collection(db, COLLECTION));
  const unitData = {
    building: data.building,
    num: data.num,
    floor: data.floor,
    owner: data.owner ?? "",
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref, unitData);
  return { id: ref.id, ...unitData };
}

export async function getUnitsByBuilding(buildingId: string): Promise<Unit[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("building", "==", buildingId))
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Unit));
}
