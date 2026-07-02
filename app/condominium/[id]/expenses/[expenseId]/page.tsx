"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { getCondominium } from "@/lib/services/condominiumService";
import { getExpense } from "@/lib/services/expenseService";
import { getBuilding } from "@/lib/services/buildingService";
import { getUnit } from "@/lib/services/unitService";
import {
  getEntriesByExpense,
  markEntryAsPaid,
} from "@/lib/services/expenseEntryService";
import { Condominium, Expense, ExpenseEntry, Building, Unit } from "@/lib/types";
import PaymentOrderItem from "@/components/PaymentOrderItem";
import { PageSkeleton } from "@/components/skeleton";

export default function ExpenseDetailPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [units, setUnits] = useState<Record<string, Unit>>({});
  const [buildings, setBuildings] = useState<Record<string, Building>>({});
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!params.id || !params.expenseId) return;
    const condoId = params.id as string;
    const expenseId = params.expenseId as string;

    Promise.all([getCondominium(condoId), getExpense(expenseId)]).then(
      async ([c, exp]) => {
        if (!c || !exp) {
          router.replace("/home");
          return;
        }
        setCondominium(c);
        setExpense(exp);

        const expenseEntries = await getEntriesByExpense(expenseId);
        setEntries(expenseEntries);

        const unitMap: Record<string, Unit> = {};
        const buildingMap: Record<string, Building> = {};
        for (const entry of expenseEntries) {
          if (!unitMap[entry.unit]) {
            const unit = await getUnit(entry.unit);
            if (unit) {
              unitMap[entry.unit] = unit;
              if (!buildingMap[unit.building]) {
                const building = await getBuilding(unit.building);
                if (building) buildingMap[unit.building] = building;
              }
            }
          }
        }
        setUnits(unitMap);
        setBuildings(buildingMap);
        setLoading(false);
      }
    );
  }, [params.id, params.expenseId, router]);

  const handleValidate = async (entryId: string, note: string) => {
    if (!appUser) return;
    setValidatingId(entryId);
    try {
      await markEntryAsPaid(entryId, {
        notes: note,
        validated_by: appUser.id,
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                status: "paid",
                notes: note.trim() || e.notes,
                validated_by: appUser.id,
              }
            : e
        )
      );
    } catch {
      alert("Error al validar el pago");
    } finally {
      setValidatingId(null);
    }
  };

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
          {condominium.name} · Vence: {expense.due_date.toDate().toLocaleDateString()}
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
                isValidating={validatingId === entry.id}
              />
            );
          })
        )}
      </section>
    </div>
  );
}
