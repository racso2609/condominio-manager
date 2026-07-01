import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, deleteDoc, where } from "firebase/firestore";
import { db } from "@/firebase";
import { Building, Unit } from "@/lib/types";
import { getUnitsByBuilding } from "@/lib/services/unitService";

const COLLECTION = "buildings";
const UNITS_COLLECTION = "units";

export async function createBuilding(data: {
  condominium: string;
  name: string;
  symbol: string;
  address?: string;
}): Promise<Building> {
  const now = Timestamp.now();
  const ref = doc(collection(db, COLLECTION));
  const buildingData = {
    condominium: data.condominium,
    name: data.name,
    symbol: data.symbol,
    address: data.address ?? "",
    created_at: now,
    updated_at: now,
  };
  await setDoc(ref, buildingData);
  return { id: ref.id, ...buildingData };
}

export async function getBuilding(id: string): Promise<Building | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Building;
}

export async function updateBuilding(
  id: string,
  data: { name: string; symbol: string; address?: string }
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    name: data.name,
    symbol: data.symbol,
    address: data.address ?? "",
    updated_at: Timestamp.now(),
  });
}

export async function deleteBuilding(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function getBuildingsByCondominium(condominiumId: string): Promise<Building[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("condominium", "==", condominiumId))
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Building));
}

export async function duplicateBuilding(
  sourceBuildingId: string,
  data: { condominium: string; name: string; symbol: string; address?: string }
): Promise<Building> {
  const now = Timestamp.now();
  const buildingRef = doc(collection(db, COLLECTION));
  const buildingData = {
    condominium: data.condominium,
    name: data.name,
    symbol: data.symbol,
    address: data.address ?? "",
    created_at: now,
    updated_at: now,
  };
  await setDoc(buildingRef, buildingData);

  const sourceUnits = await getUnitsByBuilding(sourceBuildingId);
  for (const unit of sourceUnits) {
    const unitRef = doc(collection(db, UNITS_COLLECTION));
    await setDoc(unitRef, {
      building: buildingRef.id,
      num: unit.num,
      floor: unit.floor,
      type: unit.type,
      owner: "",
      created_at: now,
      updated_at: now,
    });
  }

  return { id: buildingRef.id, ...buildingData };
}
