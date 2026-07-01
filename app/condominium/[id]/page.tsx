"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { getCondominium, updateCondominiumStatus } from "@/lib/services/condominiumService";
import { getBuildingsByCondominium } from "@/lib/services/buildingService";
import { getUnitsByBuilding } from "@/lib/services/unitService";
import { Condominium, Building } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

export default function CondominiumDetail() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingStatus, setChangingStatus] = useState(false);
  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  const fetchData = async () => {
    if (!params.id) return;
    const id = params.id as string;
    const [c, b] = await Promise.all([getCondominium(id), getBuildingsByCondominium(id)]);
    if (!c) router.replace("/home");
    else {
      setCondominium(c);
      setBuildings(b);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [params.id, router]);

  const handleToggleStatus = async () => {
    if (!condominium || !appUser) return;
    const targetStatus = condominium.status === "draft" ? "complete" : "draft";

    if (targetStatus === "complete") {
      if (buildings.length === 0) {
        alert("El condominio debe tener al menos un edificio.");
        return;
      }
      const unitCounts = await Promise.all(
        buildings.map((b) => getUnitsByBuilding(b.id).then((u) => u.length))
      );
      const hasEmptyBuilding = unitCounts.some((count) => count === 0);
      if (hasEmptyBuilding) {
        alert("Todos los edificios deben tener al menos una unidad.");
        return;
      }
    }

    setChangingStatus(true);
    try {
      await updateCondominiumStatus(condominium.id, targetStatus);
      setCondominium((prev) => prev ? { ...prev, status: targetStatus } : prev);
    } catch {
      alert("Error al cambiar el estado");
    } finally {
      setChangingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <div className="h-48 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!condominium) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/home" className="hover:text-zinc-700 dark:hover:text-zinc-200">
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
              <button
                onClick={handleToggleStatus}
                disabled={changingStatus}
                className="h-10 rounded-full bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {changingStatus ? "..." : "Completar registro"}
              </button>
            )}
            {condominium.status === "complete" && (
              <button
                onClick={handleToggleStatus}
                disabled={changingStatus}
                className="h-10 rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {changingStatus ? "..." : "Volver a borrador"}
              </button>
            )}
            <Link
              href={`/condominium/${condominium.id}/buildings/new`}
              className="flex h-10 items-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Añadir edificio
            </Link>
          </div>
        )}
      </div>

      {isAdminOrManager && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/condominium/${condominium.id}/announcements`}
            className="flex h-9 items-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Anuncios
          </Link>
          <Link
            href={`/condominium/${condominium.id}/invite`}
            className="flex h-9 items-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Invitar residentes
          </Link>
          <Link
            href={`/condominium/${condominium.id}/residents`}
            className="flex h-9 items-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Gestionar residentes
          </Link>
        </div>
      )}

      {buildings.length === 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            {isAdminOrManager
              ? "Usa el botón \"Añadir edificio\" para comenzar a registrar los edificios de este condominio."
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
