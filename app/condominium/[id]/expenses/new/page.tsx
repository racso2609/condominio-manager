"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { getCondominium } from "@/lib/services/condominiumService";
import { getBuildingsByCondominium } from "@/lib/services/buildingService";
import { getUnitsByBuilding } from "@/lib/services/unitService";
import { createExpense } from "@/lib/services/expenseService";
import { createExpenseEntries } from "@/lib/services/expenseEntryService";
import { Condominium, Building, Unit } from "@/lib/types";
import { FormSkeleton } from "@/components/skeleton";

export default function NewExpensePage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [scope, setScope] = useState<"condominium" | "building">("condominium");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!params.id) return;
    const id = params.id as string;
    Promise.all([getCondominium(id), getBuildingsByCondominium(id)]).then(
      ([c, blds]) => {
        if (!c) router.replace("/home");
        else {
          setCondominium(c);
          setBuildings(blds);
          if (blds.length > 0) setSelectedBuilding(blds[0].id);
        }
        setLoading(false);
      }
    );
  }, [params.id, router]);

  const getScopeUnits = async (): Promise<Unit[]> => {
    if (scope === "condominium") {
      const allUnits: Unit[] = [];
      for (const b of buildings) {
        const units = await getUnitsByBuilding(b.id);
        allUnits.push(...units);
      }
      return allUnits;
    }
    if (!selectedBuilding) return [];
    return getUnitsByBuilding(selectedBuilding);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !params.id) return;
    setSaving(true);
    try {
      const units = await getScopeUnits();
      if (units.length === 0) {
        alert("No hay unidades en el ámbito seleccionado.");
        setSaving(false);
        return;
      }

      const totalAmount = parseFloat(amount);
      if (isNaN(totalAmount) || totalAmount <= 0) {
        alert("Ingresa un monto válido.");
        setSaving(false);
        return;
      }

      const perUnit = totalAmount / units.length;
      const unitAmounts = units.map((u) => ({
        unit: u.id,
        amount: Math.round(perUnit * 100) / 100,
      }));

      const remainder = Math.round(
        (totalAmount - unitAmounts.reduce((s, ua) => s + ua.amount, 0)) * 100
      ) / 100;
      if (Math.abs(remainder) > 0.001 && unitAmounts.length > 0) {
        unitAmounts[0].amount = Math.round((unitAmounts[0].amount + remainder) * 100) / 100;
      }

      const expense = await createExpense({
        condominium: scope === "condominium" ? (params.id as string) : undefined,
        building: scope === "building" ? selectedBuilding : undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        amount: totalAmount,
        due_date: new Date(dueDate),
        period_start: periodStart ? new Date(periodStart) : undefined,
        period_end: periodEnd ? new Date(periodEnd) : undefined,
      });

      await createExpenseEntries(expense.id, unitAmounts);

      router.push(`/condominium/${params.id}/expenses`);
    } catch {
      alert("Error al crear el gasto");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <FormSkeleton titleWidth="w-40" inputCount={6} />;
  }

  if (!isAdminOrManager) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-zinc-500 dark:text-zinc-400">
          No tienes permisos para crear gastos.
        </p>
      </div>
    );
  }

  if (!condominium) return null;

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
          href={`/condominium/${params.id}`}
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {condominium.name}
        </Link>
        <span>/</span>
        <Link
          href={`/condominium/${params.id}/expenses`}
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Gastos
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">Nuevo</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Nuevo gasto
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <fieldset className="flex gap-4">
            <legend className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Ámbito
            </legend>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="radio"
                name="scope"
                value="condominium"
                checked={scope === "condominium"}
                onChange={() => setScope("condominium")}
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              Todo el condominio
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="radio"
                name="scope"
                value="building"
                checked={scope === "building"}
                onChange={() => setScope("building")}
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              Un edificio
            </label>
          </fieldset>

          {scope === "building" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Edificio
              </span>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                required
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Título
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Descripción
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-y rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Monto total ($)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Fecha de vencimiento
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Período desde
              </span>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Período hasta
              </span>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
              />
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={saving || !title.trim() || !amount || !dueDate}
            variant="primary"
            size="lg"
          >
            {saving ? "Creando..." : "Crear gasto"}
          </Button>
          <Button
            href={`/condominium/${params.id}/expenses`}
            variant="secondary"
            size="lg"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
