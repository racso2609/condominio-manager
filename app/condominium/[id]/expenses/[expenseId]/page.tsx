"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { useCondominium } from "@/lib/queries/useCondominium";
import { useExpense } from "@/lib/queries/useExpense";
import { useEntriesByExpense } from "@/lib/queries/useExpenseEntry";
import { useUnits } from "@/lib/queries/useUnit";
import { useBuildings } from "@/lib/queries/useBuilding";
import { useMarkEntryAsPaid } from "@/lib/mutations/useExpenseEntryMutations";
import PaymentOrderItem from "@/components/PaymentOrderItem";
import { PageSkeleton } from "@/components/skeleton";

export default function ExpenseDetailPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;
  const expenseId = params.expenseId as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
  const { data: expense, isLoading: expenseLoading } = useExpense(expenseId);
  const { data: entries = [], isLoading: entriesLoading } =
    useEntriesByExpense(expenseId);

  const unitIds = useMemo(
    () => Array.from(new Set(entries.map((e) => e.unit))),
    [entries]
  );
  const unitsQueries = useUnits(unitIds);

  const buildingIds = useMemo(() => {
    const ids = new Set<string>();
    unitsQueries.forEach((q) => {
      if (q.data) ids.add(q.data.building);
    });
    return Array.from(ids);
  }, [unitsQueries]);

  const buildingsQueries = useBuildings(buildingIds);

  const units = useMemo(() => {
    const map: Record<string, import("@/lib/types").Unit> = {};
    unitsQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [unitsQueries]);

  const buildings = useMemo(() => {
    const map: Record<string, import("@/lib/types").Building> = {};
    buildingsQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [buildingsQueries]);

  const { mutate: markAsPaid, isPending: isValidating } = useMarkEntryAsPaid();

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!condominiumLoading && !expenseLoading && (condominium === null || expense === null)) {
      router.replace("/home");
    }
  }, [condominiumLoading, expenseLoading, condominium, expense, router]);

  const handleValidate = (entryId: string, note: string) => {
    if (!appUser) return;

    markAsPaid({
      id: entryId,
      data: { notes: note, validated_by: appUser.id },
    });
  };

  const loading =
    condominiumLoading ||
    expenseLoading ||
    entriesLoading ||
    unitsQueries.some((q) => q.isLoading) ||
    buildingsQueries.some((q) => q.isLoading);

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="w-56"
        action={false}
        statsCount={1}
        cardCount={4}
        cardLines={2}
      />
    );
  }

  if (!isAdminOrManager) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-zinc-500 dark:text-zinc-400">
          No tienes permisos para ver esta página.
        </p>
      </div>
    );
  }

  if (!condominium || !expense) return null;

  const totalPaid = entries.filter((e) => e.status === "paid").length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/home"
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Mis condominios
        </Link>
        <span>/</span>
        <Link
          href={`/condominium/${condominium.id}`}
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {condominium.name}
        </Link>
        <span>/</span>
        <Link
          href={`/condominium/${condominium.id}/expenses`}
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Gastos
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">{expense.title}</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {expense.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {condominium.name} · Vence: {new Date(expense.due_date).toLocaleDateString()}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Progreso de cobro
        </p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {totalPaid}/{entries.length}
        </p>
      </div>

      {expense.items && expense.items.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Conceptos
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
            <div className="flex flex-col gap-2">
              {expense.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {item.description}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    ${item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Total
              </span>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                ${expense.amount.toFixed(2)}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          Pagos por unidad
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No hay unidades asignadas a este gasto.
          </p>
        ) : (
          entries.map((entry) => {
            const unit = units[entry.unit];
            return (
              <PaymentOrderItem
                key={entry.id}
                entry={entry}
                expense={expense}
                unit={unit}
                building={unit ? buildings[unit.building] : undefined}
                showValidateForm
                onValidate={(note) => handleValidate(entry.id, note)}
                isValidating={isValidating}
              />
            );
          })
        )}
      </section>
    </div>
  );
}
