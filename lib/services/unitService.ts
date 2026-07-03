import { supabase } from "@/lib/supabase";
import { Unit } from "@/lib/types";

const TABLE = "units";
const ROLES_TABLE = "condominium_roles";
const BUILDINGS_TABLE = "buildings";

function generateId(): string {
  return crypto.randomUUID();
}

export function getUnitNumber(
  floor: number,
  index: number,
  prefix: string = "",
  suffix: string = ""
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
  const now = new Date().toISOString();
  const id = generateId();
  const unitData = {
    id,
    building: data.building,
    num: data.num,
    floor: data.floor,
    type: data.type,
    owner: data.owner ?? "",
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(TABLE).insert(unitData);
  if (error) throw error;

  return unitData as Unit;
}

export async function generateUnits(
  buildingId: string,
  floors: number,
  unitsPerFloor: number,
  type: "residential" | "office",
  floorOffset: number = 0,
  prefix: string = "",
  suffix: string = ""
): Promise<Unit[]> {
  const now = new Date().toISOString();
  const created: Unit[] = [];

  for (let f = 0; f < floors; f++) {
    const actualFloor = f + floorOffset;
    for (let u = 0; u < unitsPerFloor; u++) {
      const num = getUnitNumber(actualFloor, u, prefix, suffix);
      const unitData = {
        id: generateId(),
        building: buildingId,
        num,
        floor: actualFloor,
        type,
        owner: "",
        created_at: now,
        updated_at: now,
      };
      created.push(unitData as Unit);
    }
  }

  if (created.length > 0) {
    const { error } = await supabase.from(TABLE).insert(created);
    if (error) throw error;
  }

  return created;
}

export async function getUnitsByBuilding(buildingId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("building", buildingId);

  if (error) throw error;
  return (data ?? []) as Unit[];
}

export async function getUnit(id: string): Promise<Unit | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Unit;
}

export async function deleteUnit(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function updateUnitType(
  id: string,
  type: "residential" | "office"
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ type, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function claimUnit(unitId: string, userId: string): Promise<void> {
  const unit = await getUnit(unitId);
  if (!unit) throw new Error("Unidad no encontrada");

  if (unit.claim_blocked_until && new Date(unit.claim_blocked_until).getTime() > Date.now()) {
    const days = Math.ceil(
      (new Date(unit.claim_blocked_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    throw new Error(
      `Esta unidad fue reclamada recientemente. Intenta de nuevo en ${days} día(s).`
    );
  }

  const { data: building, error: buildingError } = await supabase
    .from(BUILDINGS_TABLE)
    .select("condominium")
    .eq("id", unit.building)
    .single();

  if (buildingError || !building) throw new Error("Edificio no encontrado");

  const { data: roles, error: roleError } = await supabase
    .from(ROLES_TABLE)
    .select("*")
    .eq("condominium", building.condominium)
    .eq("user", userId);

  if (roleError) throw roleError;
  if (!roles || roles.length === 0) {
    throw new Error("Debes ser parte del condominio para reclamar una unidad");
  }

  const { error } = await supabase
    .from(TABLE)
    .update({
      owner: userId,
      owner_status: "pending",
      claim_blocked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unitId);

  if (error) throw error;
}

export async function rejectUnitClaim(unitId: string): Promise<void> {
  const blockedUntil = new Date();
  blockedUntil.setDate(blockedUntil.getDate() + 7);

  const { error } = await supabase
    .from(TABLE)
    .update({
      owner: "",
      owner_status: null,
      claim_blocked_until: blockedUntil.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", unitId);

  if (error) throw error;
}

export async function verifyUnitOwner(unitId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ owner_status: "verified", updated_at: new Date().toISOString() })
    .eq("id", unitId);

  if (error) throw error;
}

export async function assignUnitOwner(
  unitId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      owner: userId,
      owner_status: "verified",
      claim_blocked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unitId);

  if (error) throw error;
}

export async function removeUnitOwner(unitId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      owner: "",
      owner_status: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unitId);

  if (error) throw error;
}

export async function getUnitsByOwner(userId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("owner", userId);

  if (error) throw error;
  return (data ?? []) as Unit[];
}

export async function getPendingUnitsByBuilding(buildingId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("building", buildingId)
    .eq("owner_status", "pending");

  if (error) throw error;
  return (data ?? []) as Unit[];
}

export async function getUnitsByOwnerStatus(
  status: "pending" | "verified"
): Promise<Unit[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("owner_status", status);

  if (error) throw error;
  return (data ?? []) as Unit[];
}
