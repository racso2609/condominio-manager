"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { useCondominiumPage } from "@/hooks/useCondominiumPage";
import { useBuildingsByCondominium } from "@/lib/queries/useBuilding";
import {
  useExpensesByCondominium,
  useExpensesByBuildings,
} from "@/lib/queries/useExpense";
import { useEntriesByExpenses } from "@/lib/queries/useExpenseEntry";
import {
  isExpenseCancelled,
  getExpenseCancellationInfo,
  getCleanExpenseDescription,
} from "@/lib/utils/expense";
import { PageSkeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/EmptyState";

type ExpenseTab = "active" | "cancelled" | "all";

export default function ExpensesPage() {
  const {
    condominiumId,
    condominium,
    condominiumLoading,
    isAdminOrManager,
    isCondoAdmin,
    managedBuildingIds,
  } = useCondominiumPage();
  const { data: allBuildings = [], isLoading: buildingsLoading } =
    useBuildingsByCondominium(condominiumId);

  const buildings = useMemo(
    () =>
      isCondoAdmin
        ? allBuildings
        : allBuildings.filter((b) => managedBuildingIds.includes(b.id)),
    [allBuildings, isCondoAdmin, managedBuildingIds]
  );

  const buildingIds = useMemo(() => buildings.map((b) => b.id), [buildings]);

  const { data: condoExpenses = [], isLoading: condoExpensesLoading } =
    useExpensesByCondominium(condominiumId);
  const buildingExpensesQueries = useExpensesByBuildings(buildingIds);

  const expenses = useMemo(() => {
    if (!isCondoAdmin) {
      return buildingExpensesQueries.flatMap((q) => q.data ?? []);
    }
    return condoExpenses;
  }, [isCondoAdmin, condoExpenses, buildingExpensesQueries]);

  const expensesLoading =
    condoExpensesLoading || buildingExpensesQueries.some((q) => q.isLoading);

  const [activeTab, setActiveTab] = useState<ExpenseTab>("active");

  const expenseIds = useMemo(() => expenses.map((e) => e.id), [expenses]);
  const entriesQueries = useEntriesByExpenses(expenseIds);

  const entryCounts = useMemo(() => {
    const counts: Record<string, string> = {};
    entriesQueries.forEach((q, index) => {
      const expenseId = expenseIds[index];
      if (!expenseId || !q.data) return;
      const paid = q.data.filter((e) => e.status === "paid").length;
      counts[expenseId] = `${paid}/${q.data.length}`;
    });
    return counts;
  }, [entriesQueries, expenseIds]);

  const activeExpenses = useMemo(
    () => expenses.filter((e) => !isExpenseCancelled(e)),
    [expenses]
  );
  const cancelledExpenses = useMemo(
    () => expenses.filter((e) => isExpenseCancelled(e)),
    [expenses]
  );

  const displayedExpenses = useMemo(() => {
    if (activeTab === "active") return activeExpenses;
    if (activeTab === "cancelled") return cancelledExpenses;
    return expenses;
  }, [activeTab, activeExpenses, cancelledExpenses, expenses]);

  const loading =
    condominiumLoading ||
    buildingsLoading ||
    expensesLoading ||
    entriesQueries.some((q) => q.isLoading);

  if (loading || !condominium) {
    return <PageSkeleton titleWidth="w-32" cardCount={4} cardLines={2} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominium.id}` },
          { label: "Gastos" },
        ]}
      />

      <PageHeader
        title="Gastos"
        subtitle={condominium.name}
        action={
          isAdminOrManager ? (
            <Button
              href={`/condominium/${condominium.id}/expenses/new`}
              variant="primary"
              size="lg"
            >
              Nuevo gasto
            </Button>
          ) : undefined
        }
      />

      {/* Tabs Filter (Active / Cancelled / All) */}
      {isAdminOrManager && cancelledExpenses.length > 0 && (
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "active"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Activos ({activeExpenses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cancelled")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "cancelled"
                ? "bg-red-600 text-white dark:bg-red-500 dark:text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <span>Anulados / Eliminados ({cancelledExpenses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Todos ({expenses.length})
          </button>
        </div>
      )}

      {displayedExpenses.length === 0 ? (
        <EmptyState
          message={
            activeTab === "cancelled"
              ? "No hay gastos anulados."
              : "No hay gastos registrados."
          }
        />
      ) : (
        <section className="flex flex-col gap-4">
          {displayedExpenses.map((exp) => {
            const building = exp.building
              ? buildings.find((b) => b.id === exp.building)
              : null;
            const isCancelled = isExpenseCancelled(exp);
            const cancelInfo = getExpenseCancellationInfo(exp);
            const cleanDescription = getCleanExpenseDescription(exp.description);

            return (
              <Link
                key={exp.id}
                href={`/condominium/${condominium.id}/expenses/${exp.id}`}
                className={`rounded-xl border p-6 transition-colors ${
                  isCancelled
                    ? "border-red-200/70 bg-red-50/30 hover:border-red-300 dark:border-red-900/40 dark:bg-red-950/10 dark:hover:border-red-800"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {exp.title}
                      </h2>
                      {isCancelled && <Badge color="red">Anulado</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {building
                        ? `${building.name} · `
                        : "Todo el condominio · "}
                      Vence: {new Date(exp.due_date).toLocaleDateString()}
                    </p>
                    {isCancelled && cancelInfo.reason && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Motivo: {cancelInfo.reason}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${
                        isCancelled
                          ? "line-through text-zinc-400 dark:text-zinc-600"
                          : "text-zinc-900 dark:text-zinc-50"
                      }`}
                    >
                      ${exp.amount.toFixed(2)}
                    </p>
                    {entryCounts[exp.id] && (
                      <p className="text-xs text-zinc-500">
                        {isCancelled ? "Pagos registrados: " : "Cobrado: "}
                        {entryCounts[exp.id]}
                      </p>
                    )}
                  </div>
                </div>

                {cleanDescription && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                    {cleanDescription}
                  </p>
                )}

                {exp.period_start && exp.period_end && (
                  <p className="mt-2 text-xs text-zinc-400">
                    Período: {new Date(exp.period_start).toLocaleDateString()} —{" "}
                    {new Date(exp.period_end).toLocaleDateString()}
                  </p>
                )}
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

