import { supabase } from "@/lib/supabase";
import { Condominium, CondominiumRole } from "@/lib/types";

const CONDO_TABLE = "condominiums";
const ROLE_TABLE = "condominium_roles";

function generateId(): string {
  return crypto.randomUUID();
}

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

export async function getUserCondominiumRole(
  userId: string | undefined,
  condominiumId: string
): Promise<CondominiumRole | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .eq("user", userId)
    .single();

  if (error || !data) return null;
  return data as CondominiumRole;
}

export async function createInvite(
  condominiumId: string,
  invitedBy: string,
  email: string
): Promise<CondominiumRole> {
  const { data: existing, error: existingError } = await supabase
    .from(ROLE_TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .eq("invited_email", email)
    .is("user", null);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    throw new Error("Ya existe una invitación pendiente para este correo");
  }

  const now = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const roleData = {
    id: generateId(),
    condominium: condominiumId,
    user: null as string | null,
    role: "resident" as const,
    status: "pending" as const,
    invited_email: email,
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
