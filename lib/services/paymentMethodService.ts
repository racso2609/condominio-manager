import { supabase } from "@/lib/supabase";
import { PaymentMethod, PaymentMethodType } from "@/lib/types";
import { generateId } from "@/lib/utils/id";

const TABLE = "payment_methods";

export interface CreatePaymentMethodInput {
  condominium: string;
  name: string;
  type: PaymentMethodType;
  holder_name?: string;
  bank_name?: string;
  account_number?: string;
  routing_number?: string;
  phone?: string;
  email?: string;
  identification?: string;
  notes?: string;
  is_default?: boolean;
}

export async function createPaymentMethod(
  data: CreatePaymentMethodInput
): Promise<PaymentMethod> {
  const now = new Date().toISOString();
  const id = generateId();
  const paymentMethodData = {
    id,
    condominium: data.condominium,
    name: data.name.trim(),
    type: data.type,
    holder_name: data.holder_name?.trim() ?? null,
    bank_name: data.bank_name?.trim() ?? null,
    account_number: data.account_number?.trim() ?? null,
    routing_number: data.routing_number?.trim() ?? null,
    phone: data.phone?.trim() ?? null,
    email: data.email?.trim() ?? null,
    identification: data.identification?.trim() ?? null,
    notes: data.notes?.trim() ?? null,
    is_default: data.is_default ?? false,
    created_at: now,
    updated_at: now,
  };

  if (paymentMethodData.is_default) {
    await unsetDefaultPaymentMethods(data.condominium);
  }

  const { error } = await supabase.from(TABLE).insert(paymentMethodData);
  if (error) throw error;

  return paymentMethodData as unknown as PaymentMethod;
}

export async function getPaymentMethod(id: string): Promise<PaymentMethod | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as PaymentMethod;
}

export async function getPaymentMethodsByCondominium(
  condominiumId: string
): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("condominium", condominiumId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PaymentMethod[];
}

export async function updatePaymentMethod(
  id: string,
  condominiumId: string,
  data: Partial<CreatePaymentMethodInput>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.type !== undefined) updateData.type = data.type;
  if (data.holder_name !== undefined)
    updateData.holder_name = data.holder_name.trim() || null;
  if (data.bank_name !== undefined)
    updateData.bank_name = data.bank_name.trim() || null;
  if (data.account_number !== undefined)
    updateData.account_number = data.account_number.trim() || null;
  if (data.routing_number !== undefined)
    updateData.routing_number = data.routing_number.trim() || null;
  if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
  if (data.email !== undefined) updateData.email = data.email.trim() || null;
  if (data.identification !== undefined)
    updateData.identification = data.identification.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes.trim() || null;
  if (data.is_default !== undefined) updateData.is_default = data.is_default;

  if (data.is_default) {
    await unsetDefaultPaymentMethods(condominiumId, id);
  }

  const { error } = await supabase.from(TABLE).update(updateData).eq("id", id);
  if (error) throw error;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

async function unsetDefaultPaymentMethods(
  condominiumId: string,
  excludeId?: string
): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("condominium", condominiumId)
    .eq("is_default", true);

  if (error) throw error;

  const ids = (data ?? [])
    .map((d) => d.id as string)
    .filter((id) => id !== excludeId);

  if (ids.length === 0) return;

  const { error: updateError } = await supabase
    .from(TABLE)
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) throw updateError;
}
