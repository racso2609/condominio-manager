"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/Button";
import { useCondominiumPage } from "@/hooks/useCondominiumPage";
import { useBuildingsByCondominium } from "@/lib/queries/useBuilding";
import { useUnitsByBuildings } from "@/lib/queries/useUnit";
import { useEntriesByUnits } from "@/lib/queries/useExpenseEntry";
import { useExpensesByCondominium } from "@/lib/queries/useExpense";
import { isExpenseCancelled } from "@/lib/utils/expense";
import { useUpdateCondominiumStatus } from "@/lib/mutations/useCondominiumMutations";
import StatusBadge from "@/components/StatusBadge";
import { CondominiumDetailSkeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/EmptyState";

export default function CondominiumDetail() {
  const {
    appUser,
    params,
    condominiumId,
    condominium,
    condominiumLoading,
    isAdminOrManager,
    isCondoAdmin,
    isBuildingManager,
    isPending,
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
  const unitsQueries = useUnitsByBuildings(buildingIds);

  const units = useMemo(() => {
    return unitsQueries.flatMap((q) => q.data ?? []);
  }, [unitsQueries]);

  const totalUnits = units.length;
  const totalAliquot = useMemo(
    () => units.reduce((sum, u) => sum + (u.aliquot ?? 0), 0),
    [units]
  );

  const unitIds = useMemo(() => units.map((u) => u.id), [units]);
  const { data: entries = [], isLoading: entriesLoading } =
    useEntriesByUnits(unitIds);
  const { data: condoExpenses = [] } =
    useExpensesByCondominium(condominiumId);

  const expenseMap = useMemo(() => {
    const map: Record<string, import("@/lib/types").Expense> = {};
    condoExpenses.forEach((e) => (map[e.id] = e));
    return map;
  }, [condoExpenses]);

  const { mutate: updateStatus, isPending: changingStatus } =
    useUpdateCondominiumStatus();

  const handleToggleStatus = async () => {
    if (!condominium || !appUser) return;
    const targetStatus = condominium.status === "draft" ? "complete" : "draft";

    if (targetStatus === "complete") {
      if (buildings.length === 0) {
        alert("El condominio debe tener al menos un edificio.");
        return;
      }
      const unitCounts = unitsQueries.map(
        (q) => q.data?.length ?? 0
      );
      const hasEmptyBuilding = unitCounts.some((count) => count === 0);
      if (hasEmptyBuilding) {
        alert("Todos los edificios deben tener al menos una unidad.");
        return;
      }
    }

    updateStatus({ id: condominium.id, status: targetStatus });
  };

  const loading =
    condominiumLoading ||
    buildingsLoading ||
    entriesLoading ||
    unitsQueries.some((q) => q.isLoading);

  if (loading || !condominium) {
    return <CondominiumDetailSkeleton />;
  }

  const pendingAmount = entries
    .filter(
      (e) =>
        (e.status === "pending" || e.status === "pending_validation") &&
        !isExpenseCancelled(expenseMap[e.expense])
    )
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {condominium.name}
          </h1>
          {condominium.address && (
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              {condominium.address}
            </p>
          )}
          <span className="mt-2 inline-flex items-center gap-2">
            <StatusBadge status={condominium.status} />
            {isBuildingManager && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Encargado
                {buildings.length > 0
                  ? ` · ${buildings.map((b) => b.name).join(", ")}`
                  : ""}
              </span>
            )}
            {isCondoAdmin && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Administrador
              </span>
            )}
          </span>
        </div>

        {isCondoAdmin && (
          <div className="flex gap-2">
            {condominium.status === "draft" && (
              <Button
                onClick={handleToggleStatus}
                disabled={changingStatus}
                variant="emerald"
                size="lg"
              >
                {changingStatus ? "..." : "Completar registro"}
              </Button>
            )}
            {condominium.status === "complete" && (
              <Button
                onClick={handleToggleStatus}
                disabled={changingStatus}
                variant="secondary"
                size="lg"
              >
                {changingStatus ? "..." : "Volver a borrador"}
              </Button>
            )}
            <Button
              href={`/condominium/${condominium.id}/buildings/new`}
              variant="primary"
              size="lg"
            >
              Añadir edificio
            </Button>
          </div>
        )}
      </div>

      {isPending && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-900/20">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Reclama tu unidad o apartamento
          </h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-200/80">
            Para acceder a tus pagos, reportar pagos y usar todas las
            funcionalidades de residente, necesitas reclamar una unidad o
            apartamento en este condominio.
          </p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-200/80">
            Selecciona un edificio debajo y presiona <strong>Reclamar</strong>{" "}
            en la unidad que te corresponde. Un administrador validará tu
            solicitud.
          </p>
        </section>
      )}

      {units.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Monto pendiente
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              ${pendingAmount.toFixed(2)}
            </p>
          </div>
          <Button
            href={`/condominium/${condominium.id}/pagos`}
            variant="primary"
            size="md"
          >
            Ir a pagos
          </Button>
        </div>
      )}

      {totalUnits > 0 && (
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total unidades
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {totalUnits}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total alícuotas
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {totalAliquot.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isAdminOrManager && (
          <>
            <Button
              href={`/condominium/${condominium.id}/announcements`}
              variant="secondary"
              size="md"
            >
              Anuncios
            </Button>
            <Button
              href={`/condominium/${condominium.id}/expenses`}
              variant="secondary"
              size="md"
            >
              Gastos
            </Button>
            <Button
              href={`/condominium/${condominium.id}/residents`}
              variant="secondary"
              size="md"
            >
              Gestionar residentes
            </Button>
            {isCondoAdmin && (
              <>
                <Button
                  href={`/condominium/${condominium.id}/invite`}
                  variant="secondary"
                  size="md"
                >
                  Invitar residentes
                </Button>
                <Button
                  href={`/condominium/${condominium.id}/payment-methods`}
                  variant="secondary"
                  size="md"
                >
                  Métodos de pago
                </Button>
              </>
            )}
          </>
        )}
        <Button
          href={`/condominium/${condominium.id}/pagos`}
          variant="secondary"
          size="md"
        >
          Mis pagos
        </Button>
        <Button
          href={`/condominium/${condominium.id}/complaints`}
          variant="secondary"
          size="md"
        >
          Quejas
        </Button>
      </div>

      {buildings.length === 0 ? (
        <EmptyState message={isAdminOrManager ? 'Usa el botón "Añadir edificio" para comenzar a registrar los edificios de este condominio.' : "No hay edificios disponibles en este momento."} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {buildings.map((b) => {
            const buildingUnits = units.filter((u) => u.building === b.id);
            const buildingUnitCount = buildingUnits.length;
            const buildingAliquot = buildingUnits.reduce(
              (sum, u) => sum + (u.aliquot ?? 0),
              0
            );
            return (
              <Link
                key={b.id}
                href={`/condominium/${params.id}/buildings/${b.id}`}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {b.symbol}
                  </span>
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                      {b.name}
                    </h3>
                    {b.address && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {b.address}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {buildingUnitCount}{" "}
                  {buildingUnitCount === 1 ? "unidad" : "unidades"} ·{" "}
                  {buildingAliquot.toFixed(2)}%
                </p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
