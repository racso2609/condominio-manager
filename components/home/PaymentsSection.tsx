"use client";

import Link from "next/link";
import PaymentOrderItem from "@/components/PaymentOrderItem";
import { ExpenseEntry, Unit, Building, Expense } from "@/lib/types";
import { isExpenseCancelled } from "@/lib/utils/expense";

interface PaymentsSectionProps {
  paymentEntries: ExpenseEntry[];
  paymentUnits: Record<string, Unit>;
  paymentBuildings: Record<string, Building>;
  paymentExpenses: Record<string, Expense>;
  condominiumNames: Record<string, string>;
}

export function PaymentsSection({
  paymentEntries,
  paymentUnits,
  paymentBuildings,
  paymentExpenses,
  condominiumNames,
}: PaymentsSectionProps) {
  const pendingEntries = paymentEntries.filter(
    (e) =>
      (e.status === "pending" || e.status === "pending_validation") &&
      !isExpenseCancelled(paymentExpenses[e.expense])
  );

  const totalPending = pendingEntries.reduce((sum, e) => sum + e.amount, 0);

  const grouped: Record<string, ExpenseEntry[]> = {};
  for (const entry of pendingEntries) {
    const unit = paymentUnits[entry.unit];
    const building = unit ? paymentBuildings[unit.building] : null;
    const condoId = building?.condominium ?? "unknown";
    if (!grouped[condoId]) grouped[condoId] = [];
    grouped[condoId].push(entry);
  }

  return (
    <section aria-labelledby="payments-heading">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2
            id="payments-heading"
            className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Pagos pendientes
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Revisa y realiza los pagos pendientes de tus unidades
          </p>
        </div>
        {pendingEntries.length > 0 && (
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            ${totalPending.toFixed(2)}
          </span>
        )}
      </div>

      {pendingEntries.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            No tienes pagos pendientes
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            ¡Gracias por estar al día!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([condoId, entries]) => (
            <div key={condoId}>
              <Link
                href={`/condominium/${condoId}/pagos`}
                className="mb-3 inline-block text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {condominiumNames[condoId] ?? "Condominio"}
              </Link>
              <div className="flex flex-col gap-3">
                {entries.slice(0, 3).map((entry) => {
                  const unit = paymentUnits[entry.unit];
                  return (
                    <PaymentOrderItem
                      key={entry.id}
                      entry={entry}
                      expense={paymentExpenses[entry.expense]}
                      unit={unit}
                      building={
                        unit ? paymentBuildings[unit.building] : undefined
                      }
                    />
                  );
                })}
                {entries.length > 3 && (
                  <Link
                    href={`/condominium/${condoId}/pagos`}
                    className="text-center text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Ver todos ({entries.length})
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
