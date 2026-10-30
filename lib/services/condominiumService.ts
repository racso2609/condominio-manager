import { supabase } from "@/lib/supabase";
import {
  Condominium,
  CondominiumRole,
  BuildingManagerAssignment,
  CondominiumMembership,
  pickPrimaryRole,
} from "@/lib/types";
import { generateId } from "@/lib/utils/id";

const CONDO_TABLE = "condominiums";
const ROLE_TABLE = "condominium_roles";
const BUILDING_TABLE = "buildings";
const ASSIGNMENT_TABLE = "building_manager_assignments";

function generateToken(): string {
  return crypto.randomUUID();
}

export async function getUserCondominiums(
  userId: string,
  role: string
): Promise<Condominium[]> {
  if (role === "admin") {
    const { data, error } = await supabase.from(CONDO_TABLE).select("*");
    if (error) throw error;
    return (data ?? []) as Condominium[];
  }

  const { data: roles, error: rolesError } = await supabase
    .from(ROLE_TABLE)
    .select("condominium")
    .eq("user", userId);

  if (rolesError) throw rolesError;
  if (!roles || roles.length === 0) return [];

  const condominiumIds = Array.from(new Set(roles.map((r) => r.condominium)));

  const { data, error } = await supabase
    .from(CONDO_TABLE)
    .select("*")
    .in("id", condominiumIds);

  if (error) throw error;
  return (data ?? []) as Condominium[];
}

export async function getCondominium(id: string): Promise<Condominium | null> {
  const { data, error } = await supabase
    .from(CONDO_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Condominium;
}

export async function createCondominium(data: {
  name: string;
  address: string;
  creator: string;
}): Promise<Condominium> {
  const now = new Date().toISOString();
  const condoId = generateId();
  const condoData = {
    id: condoId,
    name: data.name,
    address: data.address,
    creator: data.creator,
    status: "draft" as const,
    created_at: now,
    updated_at: now,
  };

  const { error: condoError } = await supabase.from(CONDO_TABLE).insert(condoData);
  if (condoError) throw condoError;

  const { error: roleError } = await supabase.from(ROLE_TABLE).insert({
    id: generateId(),
    condominium: condoId,
    user: data.creator,
    role: "administrator",
    status: "verified",
    created_at: now,
    updated_at: now,
  });
  if (roleError) throw roleError;

  return condoData as Condominium;
}

export async function getCondominiumRoles(condominiumId: string): Promise<CondominiumRole[]> {
  const { data, error } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("condominium", condominiumId);

  if (error) throw error;
  return (data ?? []) as CondominiumRole[];
}

// Single source of truth for a user's role in a condominium. Handles duplicate
// role rows by ranking (verified + administrator wins) so callers never break
// on `.single()`.
export async function getUserCondominiumRole(
  userId: string | undefined,
  condominiumId: string
): Promise<CondominiumRole | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .eq("user", userId);

  if (error) throw error;
  return pickPrimaryRole((data ?? []) as CondominiumRole[]);
}

async function getAssignmentBuildingIds(roleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(ASSIGNMENT_TABLE)
    .select("building")
    .eq("role", roleId);

  if (error) throw error;
  return (data ?? []).map((a) => a.building as string);
}

export async function getManagedBuildingIds(
  userId: string,
  condominiumId: string
): Promise<string[]> {
  const role = await getUserCondominiumRole(userId, condominiumId);
  if (!role || role.role !== "administrator" || role.status !== "verified") {
    return [];
  }
  return getAssignmentBuildingIds(role.id);
}

// Resolves the full membership (access role + scope) in one call.
export async function getCondominiumMembership(
  userId: string | undefined,
  condominiumId: string,
  globalRole?: string
): Promise<CondominiumMembership> {
  if (!userId) {
    return { role: "none", userRole: null, managedBuildingIds: [] };
  }

  const userRole = await getUserCondominiumRole(userId, condominiumId);
  const isAdminRole =
    userRole?.role === "administrator" && userRole?.status === "verified";
  const managedBuildingIds =
    isAdminRole || globalRole === "admin" || globalRole === "administrator"
      ? userRole
        ? await getAssignmentBuildingIds(userRole.id)
        : []
      : [];

  if (globalRole === "admin" || globalRole === "administrator") {
    return { role: "super_admin", userRole, managedBuildingIds };
  }

  if (!userRole) {
    return { role: "none", userRole: null, managedBuildingIds: [] };
  }

  if (userRole.status === "pending") {
    return { role: "pending", userRole, managedBuildingIds: [] };
  }

  if (userRole.role === "administrator") {
    return {
      role: managedBuildingIds.length > 0 ? "building_manager" : "condo_admin",
      userRole,
      managedBuildingIds,
    };
  }

  return { role: "resident", userRole, managedBuildingIds: [] };
}

export async function getBuildingManagers(
  condominiumId: string
): Promise<{ role: CondominiumRole; buildings: string[] }[]> {
  const { data: roles, error: rolesError } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .eq("role", "administrator");

  if (rolesError) throw rolesError;
  if (!roles || roles.length === 0) return [];

  const roleIds = roles.map((r) => r.id);
  const { data: assignments, error: assignError } = await supabase
    .from(ASSIGNMENT_TABLE)
    .select("*")
    .in("role", roleIds);

  if (assignError) throw assignError;

  const byRole = new Map<string, string[]>();
  (assignments ?? []).forEach((a: BuildingManagerAssignment) => {
    const list = byRole.get(a.role) ?? [];
    list.push(a.building);
    byRole.set(a.role, list);
  });

  return roles
    .map((r) => ({
      role: r as CondominiumRole,
      buildings: byRole.get(r.id) ?? [],
    }))
    .filter((m) => m.buildings.length > 0);
}

export async function addBuildingManagerAssignment(
  roleId: string,
  building: string
): Promise<void> {
  const { error } = await supabase.from(ASSIGNMENT_TABLE).insert({
    id: generateId(),
    role: roleId,
    building,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function removeBuildingManagerAssignment(
  roleId: string,
  building: string
): Promise<void> {
  const { error } = await supabase
    .from(ASSIGNMENT_TABLE)
    .delete()
    .eq("role", roleId)
    .eq("building", building);
  if (error) throw error;
}

export async function promoteToBuildingManager(
  roleId: string,
  condominiumId: string,
  buildings: string[]
): Promise<void> {
  if (buildings.length === 0) {
    throw new Error("Selecciona al menos una torre");
  }

  const { data: validBuildings, error: buildingsError } = await supabase
    .from(BUILDING_TABLE)
    .select("id")
    .eq("condominium", condominiumId)
    .in("id", buildings);

  if (buildingsError) throw buildingsError;
  if ((validBuildings ?? []).length !== buildings.length) {
    throw new Error("Una de las torres no pertenece a este condominio");
  }

  const now = new Date().toISOString();
  const assignments = buildings.map((building) => ({
    id: generateId(),
    role: roleId,
    building,
    created_at: now,
  }));

  const { error: assignError } = await supabase
    .from(ASSIGNMENT_TABLE)
    .upsert(assignments, { onConflict: "role,building", ignoreDuplicates: true });
  if (assignError) throw assignError;

  const { error: roleError } = await supabase
    .from(ROLE_TABLE)
    .update({ role: "administrator", updated_at: now })
    .eq("id", roleId);
  if (roleError) throw roleError;
}

export async function demoteToResident(roleId: string): Promise<void> {
  const { error: assignError } = await supabase
    .from(ASSIGNMENT_TABLE)
    .delete()
    .eq("role", roleId);
  if (assignError) throw assignError;

  const { error: roleError } = await supabase
    .from(ROLE_TABLE)
    .update({ role: "resident", updated_at: new Date().toISOString() })
    .eq("id", roleId);
  if (roleError) throw roleError;
}

export async function createInvite(
  condominiumId: string,
  invitedBy: string,
  email: string,
  opts?: { role?: "administrator" | "resident"; buildings?: string[] }
): Promise<CondominiumRole> {
  const role = opts?.role ?? "resident";
  const buildings = opts?.buildings ?? [];

  if (role === "administrator" && buildings.length > 0) {
    const { data: validBuildings, error: buildingsError } = await supabase
      .from(BUILDING_TABLE)
      .select("id")
      .eq("condominium", condominiumId)
      .in("id", buildings);

    if (buildingsError) throw buildingsError;
    if ((validBuildings ?? []).length !== buildings.length) {
      throw new Error("Una de las torres no pertenece a este condominio");
    }
  }

  const trimmedEmail = email.trim().toLowerCase();

  // 1. Check if an active registered/offline user with this email already belongs to this condominium
  const { data: userWithEmail, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", trimmedEmail)
    .maybeSingle();

  if (userError) throw userError;

  if (userWithEmail?.id) {
    const { data: existingUserRole, error: roleCheckError } = await supabase
      .from(ROLE_TABLE)
      .select("id")
      .eq("condominium", condominiumId)
      .eq("user", userWithEmail.id);

    if (roleCheckError) throw roleCheckError;
    if (existingUserRole && existingUserRole.length > 0) {
      throw new Error("El usuario con este correo ya es parte de este condominio");
    }
  }

  // 2. Check if there's already a pending invitation for this email in this condominium
  const { data: existing, error: existingError } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .eq("invited_email", trimmedEmail)
    .is("user", null);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    throw new Error("Ya existe una invitación pendiente para este correo");
  }

  const now = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const roleId = generateId();
  const roleData = {
    id: roleId,
    condominium: condominiumId,
    user: null as string | null,
    role,
    status: "pending" as const,
    invited_email: trimmedEmail,
    invited_by: invitedBy,
    token: generateToken(),
    expires_at: expiresAt.toISOString(),
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(ROLE_TABLE).insert(roleData);
  if (error) throw error;

  if (role === "administrator" && buildings.length > 0) {
    const assignments = buildings.map((building) => ({
      id: generateId(),
      role: roleId,
      building,
      created_at: now,
    }));
    const { error: assignError } = await supabase
      .from(ASSIGNMENT_TABLE)
      .insert(assignments);
    if (assignError) throw assignError;
  }

  return roleData as unknown as CondominiumRole;
}

export async function createGlobalInvite(
  condominiumId: string,
  invitedBy: string
): Promise<CondominiumRole> {
  const now = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const roleData = {
    id: generateId(),
    condominium: condominiumId,
    user: null as string | null,
    role: "resident" as const,
    status: "pending" as const,
    invited_by: invitedBy,
    token: generateToken(),
    expires_at: expiresAt.toISOString(),
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(ROLE_TABLE).insert(roleData);
  if (error) throw error;

  return roleData as unknown as CondominiumRole;
}

export async function getInviteByToken(token: string): Promise<CondominiumRole | null> {
  const { data, error } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) return null;
  return data as CondominiumRole;
}

export async function acceptInvite(token: string, userId: string): Promise<CondominiumRole> {
  const role = await getInviteByToken(token);
  if (!role) throw new Error("Invitación no encontrada");
  if (role.expires_at && new Date(role.expires_at).getTime() < Date.now()) {
    throw new Error("Invitación expirada");
  }

  const now = new Date().toISOString();

  if (role.invited_email) {
    if (role.user) throw new Error("Invitación ya fue aceptada");

    const { data: existing, error: existingError } = await supabase
      .from(ROLE_TABLE)
      .select("*")
      .eq("condominium", role.condominium)
      .eq("user", userId);

    if (existingError) throw existingError;
    if (existing && existing.length > 0) {
      throw new Error("Ya eres parte de este condominio");
    }

    const { error } = await supabase
      .from(ROLE_TABLE)
      .update({ user: userId, updated_at: now })
      .eq("id", role.id);

    if (error) throw error;
    return { ...role, user: userId, updated_at: now };
  }

  // Global invite: create a new role for this user without consuming the token.
  const { data: existing, error: existingError } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("condominium", role.condominium)
    .eq("user", userId);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    throw new Error("Ya eres parte de este condominio");
  }

  const newRoleData = {
    id: generateId(),
    condominium: role.condominium,
    user: userId,
    role: "resident" as const,
    status: "pending" as const,
    invited_by: role.invited_by,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(ROLE_TABLE).insert(newRoleData);
  if (error) throw error;

  return newRoleData as CondominiumRole;
}

export async function getPendingInvitesByEmail(email: string): Promise<CondominiumRole[]> {
  const { data, error } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("invited_email", email)
    .is("user", null);

  if (error) throw error;
  return (data ?? []) as CondominiumRole[];
}

export async function getPendingRoles(condominiumId: string): Promise<CondominiumRole[]> {
  const { data, error } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .eq("status", "pending");

  if (error) throw error;
  return (data ?? []) as CondominiumRole[];
}

export async function verifyRole(roleId: string): Promise<void> {
  const { error } = await supabase
    .from(ROLE_TABLE)
    .update({ status: "verified", updated_at: new Date().toISOString() })
    .eq("id", roleId);

  if (error) throw error;
}

export async function deleteCondominiumRole(roleId: string): Promise<void> {
  const { error } = await supabase.from(ROLE_TABLE).delete().eq("id", roleId);
  if (error) throw error;
}

export async function updateCondominiumStatus(
  id: string,
  status: "draft" | "complete"
): Promise<void> {
  const { error } = await supabase
    .from(CONDO_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
