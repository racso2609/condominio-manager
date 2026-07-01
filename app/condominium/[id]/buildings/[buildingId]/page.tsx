"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { getBuilding, deleteBuilding } from "@/lib/services/buildingService";
import {
  getUnitsByBuilding,
  deleteUnit,
  updateUnitType,
} from "@/lib/services/unitService";
import { Building, Unit } from "@/lib/types";

export default function BuildingDetail() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!params.buildingId) return;
    const id = params.buildingId as string;
    Promise.all([getBuilding(id), getUnitsByBuilding(id)]).then(([b, u]) => {
      if (!b) router.replace(`/condominium/${params.id}`);
      else {
        setBuilding(b);
        setUnits(u);
      }
      setLoading(false);
    });
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

  const handleDeleteUnit = async (unitId: string, unitNum: string) => {
    if (!window.confirm(`¿Eliminar unidad ${unitNum}?`)) return;
    await deleteUnit(unitId);
    setUnits((prev) => prev.filter((u) => u.id !== unitId));
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <div className="h-48 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
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
            <Link
              href={`/condominium/${params.id}/buildings/${building.id}/edit`}
              className="flex h-10 items-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Editar
            </Link>
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
        {isAdminOrManager && units.length === 0 && (
          <Link
            href={`/condominium/${params.id}/buildings/${building.id}/units/new`}
            className="h-9 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Generar unidades
          </Link>
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
          {isAdminOrManager && units.length > 0 && (
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
              (a, b) => b - a
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
                  <div className="flex flex-col gap-2">
                    {floorUnits.map((u) => (
                      <div
                        key={u.id}
                        className={`flex items-center gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm transition-colors dark:bg-black ${
                          selected.has(u.id)
                            ? "border-zinc-900 dark:border-zinc-50"
                            : "border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        {isAdminOrManager && (
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
                        {isAdminOrManager && !selected.has(u.id) && (
                          <button
                            onClick={() => handleDeleteUnit(u.id, u.num)}
                            className="ml-auto text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Eliminar
                          </button>
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
