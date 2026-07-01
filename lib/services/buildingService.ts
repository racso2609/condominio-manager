import { collection, doc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore";
import { db } from "@/firebase";
import { Building } from "@/lib/types";

const COLLECTION = "buildings";

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

export async function getBuildingsByCondominium(condominiumId: string): Promise<Building[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where("condominium", "==", condominiumId))
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Building));
}
