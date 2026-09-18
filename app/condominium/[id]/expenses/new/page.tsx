"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { useCondominium } from "@/lib/queries/useCondominium";
import { useBuildingsByCondominium } from "@/lib/queries/useBuilding";
import { useUnitsByBuildings } from "@/lib/queries/useUnit";
import { useCreateExpense } from "@/lib/mutations/useExpenseMutations";
import { useCreateExpenseEntries } from "@/lib/mutations/useExpenseEntryMutations";
import { FormSkeleton } from "@/components/skeleton";
import { PermissionDenied } from "@/components/PermissionDenied";
import { ExpenseItem } from "@/lib/types";
import { FormField, Input, Select, Textarea } from "@/components/Form";

export default function NewExpensePage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
  const { data: buildings = [], isLoading: buildingsLoading } =
    useBuildingsByCondominium(condominiumId);

  const [scope, setScope] = useState<"condominium" | "building">("condominium");
  const [selectedBuilding, setSelectedBuilding] = useState(buildings[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ExpenseItem[]>([
    { id: crypto.randomUUID(), description: "", amount: 0 },
  ]);
  const [dueDate, setDueDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const totalAmount = useMemo(
    () => Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
    [items]
  );

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", amount: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ExpenseItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
              amount:
                updates.amount !== undefined
                  ? Math.round(updates.amount * 100) / 100
                  : item.amount,
            }
          : item
      )
    );
  };

  const effectiveSelectedBuilding = selectedBuilding || buildings[0]?.id || "";

  const buildingIds = useMemo(() => buildings.map((b) => b.id), [buildings]);
  const unitsQueries = useUnitsByBuildings(buildingIds);

  const allUnits = useMemo(() => {
    return unitsQueries.flatMap((q) => q.data ?? []);
  }, [unitsQueries]);

  const scopeUnits = useMemo(() => {
    if (scope === "condominium") return allUnits;
    return allUnits.filter((u) => u.building === effectiveSelectedBuilding);
  }, [scope, allUnits, effectiveSelectedBuilding]);

  const { mutate: createExpense, isPending: creatingExpense } =
    useCreateExpense();
  const { mutateAsync: createExpenseEntriesAsync } = useCreateExpenseEntries();

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!condominiumLoading && condominium === null) {
      router.replace("/home");
    }
  }, [condominiumLoading, condominium, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    if (scopeUnits.length === 0) {
      alert("No hay unidades en el ámbito seleccionado.");
      return;
    }

    if (totalAmount <= 0) {
      alert("El monto total debe ser mayor a cero.");
      return;
    }

    const validItems = items.filter((item) => item.description.trim() !== "");
    if (validItems.length === 0) {
      alert("Agrega al menos un concepto con descripción.");
      return;
    }

    const allHaveAliquot = scopeUnits.every((u) => u.aliquot != null && u.aliquot > 0);
    let unitAmounts: { unit: string; amount: number }[];

    if (allHaveAliquot && scopeUnits.length > 0) {
      const totalAliquot = scopeUnits.reduce((sum, u) => sum + (u.aliquot ?? 0), 0);
      unitAmounts = scopeUnits.map((u) => ({
        unit: u.id,
        amount: Math.round((totalAmount * ((u.aliquot ?? 0) / totalAliquot)) * 100) / 100,
      }));
    } else {
      // Equal split fallback
      const perUnit = totalAmount / scopeUnits.length;
      unitAmounts = scopeUnits.map((u) => ({
        unit: u.id,
        amount: Math.round(perUnit * 100) / 100,
      }));
    }

    // Remainder adjustment (existing logic)
    const remainder =
      Math.round(
        (totalAmount - unitAmounts.reduce((s, ua) => s + ua.amount, 0)) * 100
      ) / 100;
    if (Math.abs(remainder) > 0.001 && unitAmounts.length > 0) {
      unitAmounts[0].amount =
        Math.round((unitAmounts[0].amount + remainder) * 100) / 100;
    }

    createExpense(
      {
        condominium: scope === "condominium" ? condominiumId : undefined,
        building: scope === "building" ? effectiveSelectedBuilding : undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        items: validItems,
        due_date: new Date(dueDate),
        period_start: periodStart ? new Date(periodStart) : undefined,
        period_end: periodEnd ? new Date(periodEnd) : undefined,
      },
      {
        onSuccess: async (expense) => {
          await createExpenseEntriesAsync({
            expenseId: expense.id,
            unitAmounts,
          });
          router.push(`/condominium/${condominiumId}/expenses`);
        },
      }
    );
  };

  const loading = condominiumLoading || buildingsLoading;

  if (loading) {
    return <FormSkeleton titleWidth="w-40" inputCount={6} />;
  }

  if (!isAdminOrManager) {
    return (
      <PermissionDenied message="No tienes permisos para crear gastos." />
    );
  }

  if (!condominium) return null;

  const saving = creatingExpense;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominiumId}` },
          { label: "Gastos", href: `/condominium/${condominiumId}/expenses` },
          { label: "Nuevo" },
        ]}
      />

      <PageHeader title="Nuevo gasto" />

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
            <FormField label="Edificio">
              <Select
                value={effectiveSelectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                required
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <FormField label="Título">
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Descripción">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </FormField>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Conceptos
              </span>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
              >
                + Agregar concepto
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr,auto,auto] items-end gap-3"
                >
                  <FormField label="Descripción">
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, { description: e.target.value })
                      }
                      placeholder="Ej. Mantenimiento ascensor"
                      required
                    />
                  </FormField>
                  <FormField label="Monto ($)">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount || ""}
                      onChange={(e) =>
                        updateItem(item.id, {
                          amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="w-28"
                    />
                  </FormField>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="mb-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      aria-label={`Eliminar concepto ${index + 1}`}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Monto total
              </span>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fecha de vencimiento">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Período desde">
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </FormField>

            <FormField label="Período hasta">
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={saving || !title.trim() || totalAmount <= 0 || !dueDate}
            variant="primary"
            size="lg"
          >
            {saving ? "Creando..." : "Crear gasto"}
          </Button>
          <Button
            href={`/condominium/${condominiumId}/expenses`}
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
