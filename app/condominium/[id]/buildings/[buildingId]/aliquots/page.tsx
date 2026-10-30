"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { PermissionDenied } from "@/components/PermissionDenied";
import { BuildingDetailSkeleton } from "@/components/skeleton";
import { Input } from "@/components/Form";
import { useBuilding } from "@/lib/queries/useBuilding";
import { useUnitsByBuilding } from "@/lib/queries/useUnit";
import { useBatchUpdateAliquots } from "@/lib/mutations/useUnitMutations";
import { useCondominiumPermissions } from "@/hooks/useCondominiumPermissions";

function parseAliquot(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export default function BuildingAliquotsPage() {
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;
  const buildingId = params.buildingId as string;

  const {
    data: building,
    isLoading: buildingLoading,
    error: buildingError,
  } = useBuilding(buildingId);
  const {
    data: units = [],
    isLoading: unitsLoading,
    error: unitsError,
  } = useUnitsByBuilding(buildingId);

  const [values, setValues] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const { mutateAsync: batchUpdateAliquots, isPending: saving } =
    useBatchUpdateAliquots();

  const { canManageBuilding } = useCondominiumPermissions(condominiumId);

  useEffect(() => {
    if (!buildingLoading && building === null) {
      router.replace(`/condominium/${condominiumId}`);
    }
  }, [buildingLoading, building, router, condominiumId]);

  useEffect(() => {
    if (!initialized && units.length > 0) {
      const init: Record<string, string> = {};
      units.forEach((u) => {
        init[u.id] = u.aliquot != null ? String(u.aliquot) : "";
      });
      setValues(init);
      setInitialized(true);
    }
  }, [units, initialized]);

  const loading = buildingLoading || unitsLoading;

  if (loading) {
    return <BuildingDetailSkeleton />;
  }

  if (!building) return null;

  if (!canManageBuilding(buildingId)) {
    return (
      <PermissionDenied
        message="No tienes permisos para gestionar las alícuotas."
        backHref={`/condominium/${condominiumId}/buildings/${buildingId}`}
      />
    );
  }

  if (buildingError || unitsError) {
    return <EmptyState message="No se pudieron cargar las alícuotas." />;
  }

  const sum = units.reduce(
    (acc, u) => acc + (parseAliquot(values[u.id]) ?? 0),
    0,
  );
  const sumTone =
    sum >= 99.99 && sum <= 100.01
      ? "green"
      : sum >= 99 && sum <= 101
        ? "yellow"
        : "red";

  const changedCount = units.filter((u) => {
    const parsed = parseAliquot(values[u.id]);
    return parsed !== (u.aliquot ?? null);
  }).length;

  const handleSetAllEqual = () => {
    if (units.length === 0) return;
    const equal = Math.round((100 / units.length) * 10000000) / 10000000;
    const next: Record<string, string> = {};
    units.forEach((u) => {
      next[u.id] = String(equal);
    });
    setValues(next);
  };

  const handleSave = async () => {
    const updates = units
      .filter((u) => {
        const parsed = parseAliquot(values[u.id]);
        return parsed !== (u.aliquot ?? null);
      })
      .map((u) => ({ id: u.id, aliquot: parseAliquot(values[u.id]) }));
    if (updates.length === 0) return;
    await batchUpdateAliquots(updates);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: "Condominio", href: `/condominium/${condominiumId}` },
          {
            label: building.name,
            href: `/condominium/${condominiumId}/buildings/${buildingId}`,
          },
          { label: "Alícuotas" },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Alícuotas
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            {building.name}
          </p>
        </div>
        <Button
          onClick={handleSetAllEqual}
          variant="secondary"
          size="md"
          disabled={units.length === 0}
        >
          Igualar todas
        </Button>
      </div>

      {units.length === 0 ? (
        <EmptyState message="No hay unidades registradas en este edificio." />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Unidad</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Alícuota (%)</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      {u.num}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.type === "residential" ? "sky" : "amber"}>
                        {u.type === "residential" ? "Hab." : "Ofi."}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.0000001"
                        min="0"
                        max="100"
                        value={values[u.id] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [u.id]: e.target.value,
                          }))
                        }
                        className="w-32"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Suma total
            </span>
            <span
              className={
                sumTone === "green"
                  ? "text-lg font-semibold text-emerald-600 dark:text-emerald-400"
                  : sumTone === "yellow"
                    ? "text-lg font-semibold text-amber-500 dark:text-amber-400"
                    : "text-lg font-semibold text-red-600 dark:text-red-400"
              }
            >
              {sum.toFixed(4)}%
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || changedCount === 0}
              variant="primary"
              size="lg"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              href={`/condominium/${condominiumId}/buildings/${buildingId}`}
              variant="secondary"
              size="lg"
            >
              Cancelar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
