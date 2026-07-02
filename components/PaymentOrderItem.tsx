"use client";

import { useState } from "react";
import { Expense, ExpenseEntry, Unit, Building } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  pending_validation: "Por validar",
  paid: "Pagado",
  overdue: "Vencido",
};

interface PaymentOrderItemProps {
  entry: ExpenseEntry;
  expense?: Expense;
  unit?: Unit;
  building?: Building;
  showReportButton?: boolean;
  onReport?: () => void;
  showValidateForm?: boolean;
  onValidate?: (note: string) => void;
  isValidating?: boolean;
  className?: string;
  vesAmount?: number;
}

export default function PaymentOrderItem({
  entry,
  expense,
  unit,
  building,
  showReportButton,
  onReport,
  showValidateForm,
  onValidate,
  isValidating,
  className = "",
  vesAmount,
}: PaymentOrderItemProps) {
  const [note, setNote] = useState(entry.notes ?? "");

  const canReport =
    showReportButton &&
    onReport &&
    (entry.status === "pending" || entry.status === "pending_validation");

  const canValidate =
    showValidateForm &&
    onValidate &&
    (entry.status === "pending" || entry.status === "pending_validation");

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {expense?.title ?? "Gasto"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {unit ? `Unidad ${unit.num}` : "Unidad —"}
            {unit && building ? ` · ${building.name}` : ""}
          </p>
          {expense?.due_date && (
            <p className="mt-0.5 text-xs text-zinc-400">
              Vence: {expense.due_date.toDate().toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            ${entry.amount.toFixed(2)}
          </p>
          {vesAmount !== undefined && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              ≈ Bs{" "}
              {vesAmount.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
          <span
            className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
              entry.status === "paid"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : entry.status === "pending_validation"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {STATUS_LABELS[entry.status] ?? entry.status}
          </span>
        </div>
      </div>

      {entry.payment_reference && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          <span className="text-zinc-500">Referencia:</span>{" "}
          {entry.payment_reference}
        </p>
      )}

      {entry.payment_proof_url && (
        <div className="mt-3">
          <a
            href={entry.payment_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
          >
            Ver comprobante
          </a>
        </div>
      )}

      {entry.notes && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="text-zinc-500">Nota:</span> {entry.notes}
        </p>
      )}

      {canReport && (
        <div className="mt-4">
          <button
            onClick={onReport}
            className="h-9 rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            {entry.status === "pending_validation"
              ? "Actualizar reporte"
              : "Reportar pago"}
          </button>
        </div>
      )}

      {canValidate && (
        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Nota de validación (opcional)
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Confirmado por transferencia"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </label>
          <button
            onClick={() => onValidate(note)}
            disabled={isValidating}
            className="h-10 w-fit rounded-full bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {isValidating ? "Validando..." : "Confirmar pago"}
          </button>
        </div>
      )}
    </div>
  );
}
