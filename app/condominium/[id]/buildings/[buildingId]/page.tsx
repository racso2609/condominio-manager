"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { useBuilding } from "@/lib/queries/useBuilding";
import { useUnitsByBuilding } from "@/lib/queries/useUnit";
import { useUsers } from "@/lib/queries/useUser";
import { useDeleteBuilding } from "@/lib/mutations/useBuildingMutations";
import {
  useDeleteUnit,
  useUpdateUnitType,
  useClaimUnit,
  useVerifyUnitOwner,
  useRejectUnitClaim,
} from "@/lib/mutations/useUnitMutations";
import { BuildingDetailSkeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { useCondominiumRoles } from "@/lib/queries/useCondominium";
import { useCondominiumPermissions } from "@/hooks/useCondominiumPermissions";
import { AssignOrPreregisterModal } from "@/components/AssignOrPreregisterModal";
import { AppUser, Unit } from "@/lib/types";

export default function BuildingDetail() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const buildingId = params.buildingId as string;
  const condominiumId = params.id as string;

  const {
    isAdminOrManager,
    isCondoAdmin,
    canManageBuilding,
    isLoading: permissionsLoading,
  } = useCondominiumPermissions(condominiumId);

  const { data: building, isLoading: buildingLoading } =
    useBuilding(buildingId);
  const { data: units = [], isLoading: unitsLoading } =
    useUnitsByBuilding(buildingId);

  const ownerIds = useMemo(
    () =>
      Array.from(
        new Set(
          units.map((u) => u.owner).filter((id): id is string => id !== null),
        ),
      ),
    [units],
  );
  const ownersQueries = useUsers(ownerIds);

  const owners = useMemo(() => {
    const map: Record<string, import("@/lib/types").AppUser> = {};
    ownersQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [ownersQueries]);

  const { data: condoRoles = [] } = useCondominiumRoles(condominiumId);
  const residentUserIds = useMemo(
    () =>
      Array.from(
        new Set(
          condoRoles
            .map((r) => r.user)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    [condoRoles],
  );
  const residentUsersQueries = useUsers(residentUserIds);
  const existingResidents = useMemo(
    () =>
      residentUsersQueries
        .map((q) => q.data)
        .filter((u): u is AppUser => Boolean(u)),
    [residentUsersQueries],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [assignModalUnit, setAssignModalUnit] = useState<Unit | null>(null);

  const { mutate: deleteBuilding, isPending: deletingBuilding } =
    useDeleteBuilding();
  const { mutateAsync: deleteUnitAsync } = useDeleteUnit();
  const { mutateAsync: updateUnitTypeAsync } = useUpdateUnitType();
  const { mutate: claimUnit, isPending: claiming } = useClaimUnit();
  const { mutate: verifyUnitOwner, isPending: verifying } =
    useVerifyUnitOwner();
  const { mutate: rejectUnitClaim, isPending: rejecting } =
    useRejectUnitClaim();

  useEffect(() => {
    if (!buildingLoading && building === null) {
      router.replace(`/condominium/${condominiumId}`);
    }
  }, [buildingLoading, building, router, condominiumId]);

  useEffect(() => {
    if (
      !permissionsLoading &&
      isAdminOrManager &&
      !canManageBuilding(buildingId)
    ) {
      router.replace(`/condominium/${condominiumId}`);
    }
  }, [
    permissionsLoading,
    isAdminOrManager,
    canManageBuilding,
    buildingId,
    condominiumId,
    router,
  ]);

  const toggleUnit = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = useCallback(() => {
    if (selected.size === units.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(units.map((u) => u.id)));
    }
  }, [selected.size, units]);

  const clearSelection = () => setSelected(new Set());

  const toggleSelectMode = () => {
    setSelectMode((prev) => {
      if (prev) setSelected(new Set());
      return !prev;
    });
  };

  const bulkDelete = async () => {
    if (!window.confirm(`¿Eliminar ${selected.size} unidades seleccionadas?`))
      return;
    setProcessing(true);
    await Promise.all([...selected].map((id) => deleteUnitAsync(id)));
    setSelected(new Set());
    setProcessing(false);
  };

  const bulkSetType = async (type: "residential" | "office") => {
    setProcessing(true);
    await Promise.all(
      [...selected].map((id) => updateUnitTypeAsync({ id, type })),
    );
    setSelected(new Set());
    setProcessing(false);
  };

  const handleDeleteBuilding = () => {
    if (
      !window.confirm(
        "¿Eliminar este edificio? Esta acción no se puede deshacer.",
      )
    )
      return;

    deleteBuilding(buildingId, {
      onSuccess: () => router.push(`/condominium/${condominiumId}`),
    });
  };

  const handleClaim = (unitId: string) => {
    if (!appUser) return;
    setClaimingId(unitId);
    claimUnit(
      { unitId, userId: appUser.id },
      {
        onError: (e) =>
          alert(e instanceof Error ? e.message : "Error al reclamar unidad"),
        onSettled: () => setClaimingId(null),
      },
    );
  };

  const handleVerifyUnit = (unitId: string) => {
    verifyUnitOwner(unitId);
  };

  const handleReject = (unitId: string) => {
    if (
      !window.confirm(
        "¿Rechazar esta solicitud? El usuario no podrá reclamar esta unidad por 1 semana.",
      )
    )
      return;

    rejectUnitClaim(unitId);
  };

  const loading =
    buildingLoading || unitsLoading || ownersQueries.some((q) => q.isLoading);

  if (loading) {
    return <BuildingDetailSkeleton />;
  }

  if (!building) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: "Condominio", href: `/condominium/${condominiumId}` },
          { label: building.name },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-lg font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {building.symbol}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {building.name}
            </h1>
            {building.address && (
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {building.address}
              </p>
            )}
          </div>
        </div>

        {isAdminOrManager && (
          <div className="flex gap-2">
            {isCondoAdmin && (
              <>
                <Button
                  href={`/condominium/${condominiumId}/buildings/${building.id}/edit`}
                  variant="secondary"
                  size="lg"
                >
                  Editar
                </Button>
                <Button
                  href={`/condominium/${condominiumId}/buildings/${building.id}/duplicate`}
                  variant="secondary"
                  size="lg"
                >
                  Duplicar
                </Button>
              </>
            )}
            <Link
              href={`/condominium/${condominiumId}/buildings/${building.id}/aliquots`}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Alícuotas
            </Link>
            {isCondoAdmin && (
              <button
                onClick={handleDeleteBuilding}
                disabled={deletingBuilding}
                className="flex h-10 items-center rounded-full border border-red-200 px-5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {deletingBuilding ? "Eliminando..." : "Eliminar"}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Unidades {units.length > 0 && `(${units.length})`}
        </h2>
        {isAdminOrManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectMode}
              className={`h-9 rounded-full border px-5 text-sm font-medium transition-colors ${
                selectMode
                  ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-zinc-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {selectMode ? "Cancelar selección" : "Seleccionar"}
            </button>
            <Button
              href={`/condominium/${condominiumId}/buildings/${building.id}/units/new`}
              variant="primary"
              size="md"
            >
              Generar unidades
            </Button>
          </div>
        )}
      </div>
      {selected.size > 0 && isAdminOrManager && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {selected.size} seleccionadas
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => bulkSetType("residential")}
              disabled={processing}
              className="h-8 rounded-full border border-zinc-300 px-4 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Habitacional
            </button>
            <button
              onClick={() => bulkSetType("office")}
              disabled={processing}
              className="h-8 rounded-full border border-zinc-300 px-4 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Oficina
            </button>
            <button
              onClick={bulkDelete}
              disabled={processing}
              className="h-8 rounded-full border border-red-200 px-4 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Eliminar
            </button>
            <button
              onClick={clearSelection}
              disabled={processing}
              className="h-8 rounded-full border border-zinc-200 px-4 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {units.length === 0 ? (
        <EmptyState message={isAdminOrManager ? 'Usa el botón "Generar unidades" para crearlas automáticamente.' : "No hay unidades registradas en este edificio."} />
      ) : (
        <div className="flex flex-col gap-6">
          {isAdminOrManager && selectMode && units.length > 0 && (
            <label className="flex cursor-pointer items-center gap-3 px-1 py-1">
              <input
                type="checkbox"
                checked={selected.size === units.length}
                onChange={toggleAll}
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {selected.size === units.length
                  ? "Deseleccionar todas"
                  : "Seleccionar todas"}
              </span>
            </label>
          )}
          {(() => {
            const floors = [...new Set(units.map((u) => u.floor))].sort(
              (a, b) => b - a,
            );
            return floors.map((floor) => {
              const floorUnits = units
                .filter((u) => u.floor === floor)
                .sort((a, b) => a.num.localeCompare(b.num));
              return (
                <div key={floor}>
                  <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Piso {floor}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {floorUnits.map((u) => (
                      <div
                        key={u.id}
                        className={`flex items-center gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm transition-colors dark:bg-black ${
                          selected.has(u.id)
                            ? "border-zinc-900 dark:border-zinc-50"
                            : "border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        {isAdminOrManager && selectMode && (
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() => toggleUnit(u.id)}
                            className="accent-zinc-900 dark:accent-zinc-50"
                          />
                        )}
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {u.num}
                        </span>
                        <Badge color={u.type === "residential" ? "sky" : "amber"}>
                          {u.type === "residential" ? "Hab." : "Ofi."}
                        </Badge>
                        {u.owner && owners[u.owner] && (
                          <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>{owners[u.owner]?.name}</span>
                            {owners[u.owner]?.phone && (
                              <span className="text-zinc-400">
                                · {owners[u.owner]?.phone}
                              </span>
                            )}
                            {owners[u.owner]?.is_preregistered && (
                              <Badge color="zinc">Offline</Badge>
                            )}
                            {u.owner_status === "pending" && (
                              <span className="text-amber-500">
                                (Pendiente)
                              </span>
                            )}
                          </div>
                        )}
                        {u.claim_blocked_until &&
                          new Date(u.claim_blocked_until).getTime() >
                            Date.now() && (
                            <span className="ml-auto text-[10px] text-red-400">
                              Bloqueada
                            </span>
                          )}
                        {!u.owner && isAdminOrManager && (
                          <button
                            onClick={() => setAssignModalUnit(u)}
                            className="ml-auto h-7 rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            + Asignar / Preregistrar
                          </button>
                        )}
                        {!u.owner &&
                          !isAdminOrManager &&
                          appUser &&
                          !(
                            u.claim_blocked_until &&
                            new Date(u.claim_blocked_until).getTime() >
                              Date.now()
                          ) && (
                            <button
                              onClick={() => handleClaim(u.id)}
                              disabled={claiming && claimingId === u.id}
                              className="ml-auto h-7 rounded-full border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              {claiming && claimingId === u.id
                                ? "..."
                                : "Reclamar"}
                            </button>
                          )}
                        {isAdminOrManager &&
                          u.owner_status === "pending" &&
                          !selected.has(u.id) && (
                            <>
                              <button
                                onClick={() => handleVerifyUnit(u.id)}
                                disabled={verifying}
                                className="h-7 rounded-full bg-emerald-600 px-3 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
                              >
                                {verifying ? "..." : "Validar"}
                              </button>
                              <button
                                onClick={() => handleReject(u.id)}
                                disabled={rejecting}
                                className="h-7 rounded-full border border-red-300 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                {rejecting ? "..." : "Rechazar"}
                              </button>
                            </>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {assignModalUnit && building && (
        <AssignOrPreregisterModal
          isOpen={Boolean(assignModalUnit)}
          onClose={() => setAssignModalUnit(null)}
          unit={assignModalUnit}
          building={building}
          condominiumId={condominiumId}
          existingResidents={existingResidents}
        />
      )}
    </div>
  );
}
