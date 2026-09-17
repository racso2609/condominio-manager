import { Expense, ExpenseEntry, PaymentMethod } from "@/lib/types";

export interface AccountSummaryParams {
  condominiumName: string;
  residentName: string;
  unitsText: string;
  pendingEntries: ExpenseEntry[];
  expenses: Record<string, Expense>;
  paymentMethods: PaymentMethod[];
}

export function buildResidentAccountSummaryText({
  condominiumName,
  residentName,
  unitsText,
  pendingEntries,
  expenses,
  paymentMethods,
}: AccountSummaryParams): string {
  const totalDue = pendingEntries.reduce((sum, e) => sum + e.amount, 0);

  let msg = `🏢 *${condominiumName}*\n`;
  msg += `Estimado(a) *${residentName}*,\n`;
  msg += `📍 *Unidad(es):* ${unitsText}\n\n`;

  if (pendingEntries.length === 0) {
    msg += `✅ *Estado de cuenta:* Al día\n`;
    msg += `No registra pagos pendientes en este momento. ¡Muchas gracias por su puntualidad!\n`;
  } else {
    msg += `💵 *Total adeudado:* $${totalDue.toFixed(2)}\n\n`;
    msg += `📋 *Detalle de cuotas pendientes:*\n`;
    pendingEntries.forEach((entry) => {
      const exp = expenses[entry.expense];
      const dueDate = exp?.due_date
        ? new Date(exp.due_date).toLocaleDateString()
        : "";
      msg += `• ${exp?.title ?? "Cuota"}: $${entry.amount.toFixed(2)}${
        dueDate ? ` (Vence: ${dueDate})` : ""
      }\n`;
    });

    if (paymentMethods.length > 0) {
      msg += `\n💳 *Métodos de pago disponibles:*\n`;
      paymentMethods.forEach((pm) => {
        msg += `• *${pm.name}*`;
        const details: string[] = [];
        if (pm.bank_name) details.push(`Banco: ${pm.bank_name}`);
        if (pm.account_number) details.push(`Cuenta: ${pm.account_number}`);
        if (pm.phone) details.push(`Tlf / Pago Móvil: ${pm.phone}`);
        if (pm.identification) details.push(`Cédula / RIF: ${pm.identification}`);
        if (pm.email) details.push(`Correo: ${pm.email}`);

        if (details.length > 0) {
          msg += ` (${details.join(" · ")})`;
        }
        msg += `\n`;
      });
      msg += `\nPor favor envíe su comprobante de pago por este medio para registrarlo en el sistema. ¡Gracias!`;
    }
  }

  return msg;
}

export function buildWhatsAppLink(
  phone: string | null | undefined,
  text: string
): string {
  if (!phone) return "";
  const cleanPhone = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
