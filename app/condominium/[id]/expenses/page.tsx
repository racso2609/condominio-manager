"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { getCondominium } from "@/lib/services/condominiumService";
import { getBuildingsByCondominium } from "@/lib/services/buildingService";
import { getExpensesByCondominium } from "@/lib/services/expenseService";
import { getEntriesByExpense } from "@/lib/services/expenseEntryService";
import { Condominium, Building, Expense } from "@/lib/types";
import { PageSkeleton } from "@/components/skeleton";

export default function ExpensesPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!params.id) return;
    const id = params.id as string;
    Promise.all([
      getCondominium(id),
      getBuildingsByCondominium(id),
      getExpensesByCondominium(id),
    ]).then(async ([c, blds, exps]) => {
      if (!c) {
        router.replace("/home");
        return;
      }
      setCondominium(c);
      setBuildings(blds);
      setExpenses(exps);
      const counts: Record<string, string> = {};
      for (const exp of exps) {
        const entries = await getEntriesByExpense(exp.id);
        const paid = entries.filter((e) => e.status === "paid").length;
        counts[exp.id] = `${paid}/${entries.length}`;
      }
      setEntryCounts(counts);
      setLoading(false);
    });
  }, [params.id, router]);

  if (loading) {
    return <PageSkeleton titleWidth="w-32" cardCount={4} cardLines={2} />;
  }

  if (!condominium) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/home" className="hover:text-zinc-700 dark:hover:text-zinc-200">
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
        <span className="text-zinc-900 dark:text-zinc-50">Gastos</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Gastos
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {condominium.name}
          </p>
        </div>
        {isAdminOrManager && (
          <Button
            href={`/condominium/${condominium.id}/expenses/new`}
            variant="primary"
            size="lg"
          >
            Nuevo gasto
          </Button>
        )}
      </div>

      {expenses.length === 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            No hay gastos registrados.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          {expenses.map((exp) => {
            const building = exp.building
              ? buildings.find((b) => b.id === exp.building)
              : null;
            return (
              <Link
                key={exp.id}
                href={`/condominium/${condominium.id}/expenses/${exp.id}`}
                className="rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {exp.title}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {building
                        ? `${building.name} · `
                        : "Todo el condominio · "}
                      Vence: {exp.due_date.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      ${exp.amount.toFixed(2)}
                    </p>
                    {entryCounts[exp.id] && (
                      <p className="text-xs text-zinc-500">
                        Cobrado: {entryCounts[exp.id]}
                      </p>
                    )}
                  </div>
                </div>

                {exp.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                    {exp.description}
                  </p>
                )}

                {exp.period_start && exp.period_end && (
                  <p className="mt-2 text-xs text-zinc-400">
                    Período: {exp.period_start.toDate().toLocaleDateString()} —{" "}
                    {exp.period_end.toDate().toLocaleDateString()}
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
