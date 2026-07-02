"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { getBuilding, deleteBuilding } from "@/lib/services/buildingService";
import {
  getUnitsByBuilding,
  deleteUnit,
  updateUnitType,
  claimUnit,
  verifyUnitOwner,
  rejectUnitClaim,
} from "@/lib/services/unitService";
import { getUser } from "@/lib/services/userService";
import { Building, Unit, AppUser } from "@/lib/types";
import { BuildingDetailSkeleton } from "@/components/skeleton";

export default function BuildingDetail() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [owners, setOwners] = useState<Record<string, AppUser>>({});
  const [claiming, setClaiming] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!params.buildingId) return;
    const id = params.buildingId as string;
    Promise.all([getBuilding(id), getUnitsByBuilding(id)]).then(
      async ([b, u]) => {
        if (!b) router.replace(`/condominium/${params.id}`);
        else {
          setBuilding(b);
          setUnits(u);
          const ownerIds = new Set(
            u.filter((unit) => unit.owner).map((unit) => unit.owner),
          );
          const ownerMap: Record<string, AppUser> = {};
          for (const oid of ownerIds) {
            const user = await getUser(oid);
            if (user) ownerMap[oid] = user;
          }
          setOwners(ownerMap);
        }
        setLoading(false);
      },
    );
  }, [params.buildingId, params.id, router]);

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
    await Promise.all([...selected].map((id) => deleteUnit(id)));
    setUnits((prev) => prev.filter((u) => !selected.has(u.id)));
    setSelected(new Set());
    setProcessing(false);
  };

  const bulkSetType = async (type: "residential" | "office") => {
    setProcessing(true);
    await Promise.all([...selected].map((id) => updateUnitType(id, type)));
    setUnits((prev) =>
      prev.map((u) => (selected.has(u.id) ? { ...u, type } : u)),
    );
    setSelected(new Set());
    setProcessing(false);
  };

  const handleDeleteBuilding = async () => {
    if (
      !window.confirm(
        "¿Eliminar este edificio? Esta acción no se puede deshacer.",
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteBuilding(params.buildingId as string);
      router.push(`/condominium/${params.id}`);
    } catch {
      setDeleting(false);
    }
  };

  const handleClaim = async (unitId: string) => {
    if (!appUser) return;
    setClaiming(unitId);
    try {
      await claimUnit(unitId, appUser.id);
      setUnits((prev) =>
        prev.map((u) =>
          u.id === unitId
            ? { ...u, owner: appUser.id, owner_status: "pending" as const }
            : u,
        ),
      );
      const owner = await getUser(appUser.id);
      if (owner) setOwners((prev) => ({ ...prev, [appUser.id]: owner }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al reclamar unidad");
    } finally {
      setClaiming(null);
    }
  };

  const handleVerifyUnit = async (unitId: string) => {
    setVerifying(unitId);
    try {
      await verifyUnitOwner(unitId);
      setUnits((prev) =>
        prev.map((u) =>
          u.id === unitId ? { ...u, owner_status: "verified" as const } : u,
        ),
      );
    } catch {
      alert("Error al validar");
    } finally {
      setVerifying(null);
    }
  };

  const handleReject = async (unitId: string) => {
    if (
      !window.confirm(
        "¿Rechazar esta solicitud? El usuario no podrá reclamar esta unidad por 1 semana.",
      )
    )
      return;
    setRejecting(unitId);
    try {
      await rejectUnitClaim(unitId);
      setUnits((prev) =>
        prev.map((u) =>
          u.id === unitId ? { ...u, owner: "", owner_status: undefined } : u,
        ),
      );
    } catch {
      alert("Error al rechazar");
    } finally {
      setRejecting(null);
    }
  };

  if (loading) {
    return <BuildingDetailSkeleton />;
  }

  if (!building) return null;

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
          Condominio
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">{building.name}</span>
      </div>

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
            <Button
              href={`/condominium/${params.id}/buildings/${building.id}/edit`}
              variant="secondary"
              size="lg"
            >
              Editar
            </Button>
            <Button
              href={`/condominium/${params.id}/buildings/${building.id}/duplicate`}
              variant="secondary"
              size="lg"
            >
              Duplicar
            </Button>
            <button
              onClick={handleDeleteBuilding}
              disabled={deleting}
              className="flex h-10 items-center rounded-full border border-red-200 px-5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </button>
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
              href={`/condominium/${params.id}/buildings/${building.id}/units/new`}
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
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            {isAdminOrManager
              ? 'Usa el botón "Generar unidades" para crearlas automáticamente.'
              : "No hay unidades registradas en este edificio."}
          </p>
        </section>
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
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                            u.type === "residential"
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {u.type === "residential" ? "Hab." : "Ofi."}
                        </span>
                        {u.owner && owners[u.owner] && (
                          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                            {owners[u.owner]?.name}
                            {owners[u.owner]?.phone && (
                              <span className="ml-1 text-zinc-400">
                                · {owners[u.owner]?.phone}
                              </span>
                            )}
                            {u.owner_status === "pending" && (
                              <span className="ml-1 text-amber-500">
                                (Pendiente)
                              </span>
                            )}
                          </span>
                        )}
                        {u.claim_blocked_until &&
                          u.claim_blocked_until.toMillis() > Date.now() && (
                            <span className="ml-auto text-[10px] text-red-400">
                              Bloqueada
                            </span>
                          )}
                        {!u.owner &&
                          appUser &&
                          !(
                            u.claim_blocked_until &&
                            u.claim_blocked_until.toMillis() > Date.now()
                          ) && (
                            <button
                              onClick={() => handleClaim(u.id)}
                              disabled={claiming === u.id}
                              className="ml-auto h-7 rounded-full border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              {claiming === u.id ? "..." : "Reclamar"}
                            </button>
                          )}
                        {isAdminOrManager &&
                          u.owner_status === "pending" &&
                          !selected.has(u.id) && (
                            <>
                              <button
                                onClick={() => handleVerifyUnit(u.id)}
                                disabled={verifying === u.id}
                                className="h-7 rounded-full bg-emerald-600 px-3 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
                              >
                                {verifying === u.id ? "..." : "Validar"}
                              </button>
                              <button
                                onClick={() => handleReject(u.id)}
                                disabled={rejecting === u.id}
                                className="h-7 rounded-full border border-red-300 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                {rejecting === u.id ? "..." : "Rechazar"}
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
    </div>
  );
}
