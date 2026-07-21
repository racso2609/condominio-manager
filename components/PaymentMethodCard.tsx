import { ReactNode } from "react";
import { Badge } from "@/components/Badge";
import { PaymentMethodType } from "@/lib/types";

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  bank_transfer: "Transferencia bancaria",
  mobile_payment: "Pago móvil",
  zelle: "Zelle",
  paypal: "PayPal",
  venmo: "Venmo",
  cash: "Efectivo",
  other: "Otro",
};

export interface PaymentMethodCardData {
  id?: string;
  name: string;
  type: PaymentMethodType;
  is_default?: boolean;
  holder_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  routing_number?: string | null;
  phone?: string | null;
  email?: string | null;
  identification?: string | null;
  notes?: string | null;
}

const DETAIL_FIELDS: { key: keyof PaymentMethodCardData; label: string }[] = [
  { key: "holder_name", label: "Titular" },
  { key: "bank_name", label: "Banco" },
  { key: "account_number", label: "Cuenta" },
  { key: "routing_number", label: "Routing" },
  { key: "phone", label: "Teléfono" },
  { key: "email", label: "Correo" },
  { key: "identification", label: "Documento" },
];

export function PaymentMethodDetails({
  method,
  compact,
}: {
  method: PaymentMethodCardData;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-1 ${compact ? "text-xs" : "text-sm"} text-zinc-700 dark:text-zinc-300`}>
      {DETAIL_FIELDS.map(({ key, label }) =>
        method[key] ? (
          <p key={key}>
            {compact ? `${label}: ` : <span className="text-zinc-500">{label}:</span>}{" "}
            {method[key] as string}
          </p>
        ) : null,
      )}
    </div>
  );
}

export function PaymentMethodCard({
  method,
  compact,
  actions,
}: {
  method: PaymentMethodCardData;
  compact?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border bg-white dark:bg-black ${
        method.is_default
          ? "border-emerald-200 dark:border-emerald-900/50"
          : "border-zinc-200 dark:border-zinc-800"
      } ${compact ? "p-3" : "p-5"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {compact ? (
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {method.name}
            </p>
          ) : (
            <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
              {method.name}
            </h3>
          )}
          {method.is_default && (
            <Badge color="emerald">Predeterminado</Badge>
          )}
        </div>
        {actions}
      </div>
      <p className={`text-zinc-500 ${compact ? "mt-0.5 text-xs" : "mt-1 text-xs"}`}>
        {PAYMENT_METHOD_TYPE_LABELS[method.type]}
      </p>
      <div className={compact ? "mt-2" : "mt-3"}>
        <PaymentMethodDetails method={method} compact={compact} />
      </div>
    </div>
  );
}

