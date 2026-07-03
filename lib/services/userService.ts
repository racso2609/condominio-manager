import { supabase } from "@/lib/supabase";
import { AppUser } from "@/lib/types";

const TABLE = "users";

export async function getUser(id: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as AppUser;
}

export async function createUser(
  id: string,
  data: { name: string; email: string; photoURL?: string | null }
): Promise<AppUser> {
  const now = new Date().toISOString();
  const userData = {
    id,
    name: data.name,
    email: data.email,
    photo_url: data.photoURL ?? null,
    role: "user" as const,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from(TABLE).insert(userData);
  if (error) throw error;

  return {
    id,
    name: data.name,
    email: data.email,
    photoURL: data.photoURL ?? null,
    role: "user",
    created_at: now,
    updated_at: now,
  } as AppUser;
}

export async function updateUser(
  id: string,
  data: Partial<Pick<AppUser, "name" | "photoURL" | "role" | "phone">>
): Promise<void> {
  const mapped: Record<string, unknown> = {};
  if (data.name !== undefined) mapped.name = data.name;
  if (data.photoURL !== undefined) mapped.photo_url = data.photoURL;
  if (data.role !== undefined) mapped.role = data.role;
  if (data.phone !== undefined) mapped.phone = data.phone;

  const { error } = await supabase
    .from(TABLE)
    .update({ ...mapped, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data as AppUser;
}
