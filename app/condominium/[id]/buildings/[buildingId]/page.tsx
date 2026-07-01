"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { getBuilding, deleteBuilding } from "@/lib/services/buildingService";
import { getUnitsByBuilding } from "@/lib/services/unitService";
import { Building, Unit } from "@/lib/types";

export default function BuildingDetail() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar este edificio? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      await deleteBuilding(params.buildingId as string);
      router.push(`/condominium/${params.id}`);
    } catch {
      setDeleting(false);
    }
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
        <Link href="/home" className="hover:text-zinc-700 dark:hover:text-zinc-200">
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
              onClick={handleDelete}
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
          Unidades
        </h2>
        {isAdminOrManager && (
          <Link
            href={`/condominium/${params.id}/buildings/${building.id}/units/new`}
            className="h-9 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Añadir unidad
          </Link>
        )}
      </div>

      {units.length === 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            {isAdminOrManager
              ? "Usa el botón \"Añadir unidad\" para comenzar a registrar las unidades de este edificio."
              : "No hay unidades registradas en este edificio."}
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {units
            .sort((a, b) => b.floor - a.floor)
            .map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-black"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {u.floor}
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {u.num}
                </span>
                <span className="ml-auto text-xs text-zinc-400">
                  Piso {u.floor}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
