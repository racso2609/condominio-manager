"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { useCondominium, useUserCondominiumRole } from "@/lib/queries/useCondominium";
import { useBuildingsByCondominium } from "@/lib/queries/useBuilding";
import { useUnitsByBuildings } from "@/lib/queries/useUnit";
import { useEntriesByUnits } from "@/lib/queries/useExpenseEntry";
import { useUpdateCondominiumStatus } from "@/lib/mutations/useCondominiumMutations";
import StatusBadge from "@/components/StatusBadge";
import { CondominiumDetailSkeleton } from "@/components/skeleton";

export default function CondominiumDetail() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
  const { data: buildings = [], isLoading: buildingsLoading } =
    useBuildingsByCondominium(condominiumId);
  const { data: userRole, isLoading: roleLoading } = useUserCondominiumRole(
    appUser?.id,
    condominiumId
  );

  const buildingIds = useMemo(() => buildings.map((b) => b.id), [buildings]);
  const unitsQueries = useUnitsByBuildings(buildingIds);

  const units = useMemo(() => {
    return unitsQueries.flatMap((q) => q.data ?? []);
  }, [unitsQueries]);

  const unitIds = useMemo(() => units.map((u) => u.id), [units]);
  const { data: entries = [], isLoading: entriesLoading } =
    useEntriesByUnits(unitIds);

  const { mutate: updateStatus, isPending: changingStatus } =
    useUpdateCondominiumStatus();

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!condominiumLoading && condominium === null) {
      router.replace("/home");
    }
  }, [condominiumLoading, condominium, router]);

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
    roleLoading ||
    entriesLoading ||
    unitsQueries.some((q) => q.isLoading);

  if (loading || !condominium) {
    return <CondominiumDetailSkeleton />;
  }

  const pendingAmount = entries
    .filter((e) => e.status === "pending" || e.status === "pending_validation")
    .reduce((sum, e) => sum + e.amount, 0);

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
        <span className="text-zinc-900 dark:text-zinc-50">{condominium.name}</span>
      </div>

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
          <span className="mt-2 inline-block">
            <StatusBadge status={condominium.status} />
          </span>
        </div>

        {isAdminOrManager && (
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

      {userRole?.role === "resident" && userRole?.status === "pending" && (
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
              href={`/condominium/${condominium.id}/invite`}
              variant="secondary"
              size="md"
            >
              Invitar residentes
            </Button>
            <Button
              href={`/condominium/${condominium.id}/residents`}
              variant="secondary"
              size="md"
            >
              Gestionar residentes
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
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            {isAdminOrManager
              ? 'Usa el botón "Añadir edificio" para comenzar a registrar los edificios de este condominio.'
              : "No hay edificios disponibles en este momento."}
          </p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {buildings.map((b) => (
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
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
