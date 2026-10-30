import { supabase } from "@/lib/supabase";
import { Building, Unit } from "@/lib/types";
import { getUnitsByBuilding } from "@/lib/services/unitService";
import { generateId } from "@/lib/utils/id";

const TABLE = "buildings";
const UNITS_TABLE = "units";

export async function createBuilding(data: {
  condominium: string;
  name: string;
  symbol: string;
  address?: string;
}): Promise<Building> {
  const now = new Date().toISOString();
  const id = generateId();
  const buildingData = {
    id,
    condominium: data.condominium,
    name: data.name,
    symbol: data.symbol,
    address: data.address ?? "",
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(TABLE).insert(buildingData);
  if (error) throw error;

  return buildingData as Building;
}

export async function getBuilding(id: string): Promise<Building | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Building;
}

export async function updateBuilding(
  id: string,
  data: { name: string; symbol: string; address?: string }
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      name: data.name,
      symbol: data.symbol,
      address: data.address ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteBuilding(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function getBuildingsByCondominium(condominiumId: string): Promise<Building[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("condominium", condominiumId);

  if (error) throw error;
  return (data ?? []) as Building[];
}

export async function duplicateBuilding(
  sourceBuildingId: string,
  data: { condominium: string; name: string; symbol: string; address?: string }
): Promise<Building> {
  const now = new Date().toISOString();
  const buildingId = generateId();
  const buildingData = {
    id: buildingId,
    condominium: data.condominium,
    name: data.name,
    symbol: data.symbol,
    address: data.address ?? "",
    created_at: now,
    updated_at: now,
  };

  const { error: buildingError } = await supabase.from(TABLE).insert(buildingData);
  if (buildingError) throw buildingError;

  const sourceUnits = await getUnitsByBuilding(sourceBuildingId);
  const newUnits: Unit[] = sourceUnits.map((unit) => ({
    id: generateId(),
    building: buildingId,
    num: unit.num,
    floor: unit.floor,
    type: unit.type,
    owner: "",
    created_at: now,
    updated_at: now,
  }));

  if (newUnits.length > 0) {
    const { error: unitsError } = await supabase.from(UNITS_TABLE).insert(newUnits);
    if (unitsError) throw unitsError;
  }

  return buildingData as Building;
}
