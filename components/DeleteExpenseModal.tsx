"use client";

import { useState } from "react";
import { Expense, ExpenseEntry, Unit, Building } from "@/lib/types";
import {
  useCancelExpense,
  useDeleteExpense,
} from "@/lib/mutations/useExpenseMutations";
import { Badge } from "@/components/Badge";

interface DeleteExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
  entries: ExpenseEntry[];
  units?: Record<string, Unit>;
  buildings?: Record<string, Building>;
  currentUserId: string;
  onSuccess?: (wasCancelled: boolean) => void;
}

export function DeleteExpenseModal({
  isOpen,
  onClose,
  expense,
  entries,
  units = {},
  buildings = {},
  currentUserId,
  onSuccess,
}: DeleteExpenseModalProps) {
  const [reason, setReason] = useState("");
  const [showPaidDetails, setShowPaidDetails] = useState(false);

  const { mutate: cancelExpenseMutate, isPending: isCancelling } =
    useCancelExpense();
  const { mutate: deleteExpenseMutate, isPending: isDeleting } =
    useDeleteExpense();

  if (!isOpen) return null;

  // Identify any entries that have payment records or tenant reports
  const paidEntries = entries.filter(
    (e) =>
      e.status === "paid" ||
      e.status === "pending_validation" ||
      Boolean(e.payment_reference) ||
      Boolean(e.payment_proof_url)
  );

  const hasPayments = paidEntries.length > 0;
  const totalPaidAmount = paidEntries.reduce((sum, e) => sum + e.amount, 0);

  const handleCancelExpense = () => {
    cancelExpenseMutate(
      {
        id: expense.id,
        data: {
          deleted_by: currentUserId,
          reason: reason.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.(true);
        },
        onError: (err) => {
          alert(`Error al anular el gasto: ${(err as Error).message}`);
        },
      }
    );
  };

  const handleHardDelete = () => {
    if (
      !confirm(
        "¿Estás seguro de eliminar este gasto de forma definitiva? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    deleteExpenseMutate(expense.id, {
      onSuccess: () => {
        onClose();
        onSuccess?.(false);
      },
      onError: (err) => {
        alert(`Error al eliminar el gasto: ${(err as Error).message}`);
      },
    });
  };

  const isWorking = isCancelling || isDeleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {hasPayments ? "Eliminar / Anular gasto" : "Eliminar gasto"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {expense.title}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isWorking}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <span className="sr-only">Cerrar</span>
            ✕
          </button>
        </div>

        {hasPayments ? (
          <div className="mt-4 flex flex-col gap-4">
            {/* Warning Alert Banner */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-semibold text-sm">
                    Este gasto tiene {paidEntries.length} pago(s) registrado(s)
                  </p>
                  <p className="mt-1">
                    Monto total registrado:{" "}
                    <span className="font-semibold">
                      ${totalPaidAmount.toFixed(2)}
                    </span>
                    .
                  </p>
                  <p className="mt-1 leading-relaxed">
                    Para respaldar a los inquilinos y conservar la evidencia
                    contable, el gasto quedará registrado como{" "}
                    <strong>Anulado</strong>. Las cuotas que estaban{" "}
                    <strong>sin pagar serán eliminadas de la base de datos</strong>{" "}
                    para evitar llenar la base de datos con registros innecesarios,
                    y se conservarán únicamente los comprobantes y pagos
                    realizados como evidencia.
                  </p>
                </div>
              </div>
            </div>

            {/* Collapsible details of payments */}
            <div>
              <button
                type="button"
                onClick={() => setShowPaidDetails(!showPaidDetails)}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <span>{showPaidDetails ? "▼ Ocultar" : "▶ Ver"} evidencia de pagos ({paidEntries.length})</span>
              </button>

              {showPaidDetails && (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <ul className="flex flex-col gap-2">
                    {paidEntries.map((entry) => {
                      const unit = units[entry.unit];
                      const bld = unit ? buildings[unit.building] : undefined;
                      return (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-2 border-b border-zinc-200/50 pb-2 text-xs last:border-0 last:pb-0 dark:border-zinc-800"
                        >
                          <div>
                            <p className="font-medium text-zinc-800 dark:text-zinc-200">
                              {unit ? `Unidad ${unit.num}` : "Unidad"}
                              {bld ? ` · ${bld.name}` : ""}
                            </p>
                            {entry.payment_reference && (
                              <p className="text-[11px] text-zinc-500">
                                Ref: {entry.payment_reference}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                              ${entry.amount.toFixed(2)}
                            </span>
                            <Badge
                              color={
                                entry.status === "paid" ? "emerald" : "sky"
                              }
                            >
                              {entry.status === "paid"
                                ? "Pagado"
                                : "Por validar"}
                            </Badge>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Reason input */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Motivo de la anulación / eliminación (recomendado)
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. Creado por error en el monto, o cancelado por la junta"
                rows={2}
                className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-600"
              />
            </label>

            {/* Modal Actions */}
            <div className="mt-2 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isWorking}
                className="h-10 rounded-full px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCancelExpense}
                disabled={isWorking}
                className="h-10 rounded-full bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {isCancelling
                  ? "Anulando..."
                  : "Anular gasto y conservar evidencia"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No se ha registrado ningún pago para este gasto. Puedes eliminarlo
              definitivamente (se borrará por completo) o anularlo conservando el
              historial.
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Motivo (opcional)
              </span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. Registrado por equivocación"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-600"
              />
            </label>

            {/* Modal Actions for 0 payments */}
            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isWorking}
                className="h-10 rounded-full px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCancelExpense}
                disabled={isWorking}
                className="h-10 rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 disabled:opacity-50"
              >
                {isCancelling ? "Anulando..." : "Anular (conservar registro)"}
              </button>
              <button
                type="button"
                onClick={handleHardDelete}
                disabled={isWorking}
                className="h-10 rounded-full bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
