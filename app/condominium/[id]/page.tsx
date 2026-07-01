"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { getCondominium } from "@/lib/services/condominiumService";
import { getBuildingsByCondominium } from "@/lib/services/buildingService";
import { Condominium, Building } from "@/lib/types";

export default function CondominiumDetail() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!params.id) return;
    const id = params.id as string;
    Promise.all([getCondominium(id), getBuildingsByCondominium(id)]).then(
      ([c, b]) => {
        if (!c) router.replace("/home");
        else {
          setCondominium(c);
          setBuildings(b);
        }
        setLoading(false);
      }
    );
  }, [params.id, router]);

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
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
              condominium.status === "complete"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {condominium.status === "complete" ? "Completo" : "Borrador"}
          </span>
        </div>

        {isAdminOrManager && (
          <Link
            href={`/condominium/${condominium.id}/buildings/new`}
            className="h-10 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Añadir edificio
          </Link>
        )}
      </div>

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
