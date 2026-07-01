"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { getUserCondominiums } from "@/lib/services/condominiumService";
import { Condominium } from "@/lib/types";

export default function Home() {
  const { user, appUser, logout } = useAuthContext();
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    getUserCondominiums(appUser.id, appUser.role).then((list) => {
      setCondominiums(list);
      setLoading(false);
    });
  }, [appUser]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user && (
            <>
              <img
                src={user.photoURL ?? undefined}
                alt=""
                className="h-10 w-10 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {user.displayName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {appUser?.role === "admin"
                    ? "Super Admin"
                    : appUser?.role === "administrator"
                      ? "Administrador"
                      : "Residente"}
                </p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={logout}
          className="h-9 rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cerrar sesión
        </button>
      </header>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mis condominios
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Selecciona un condominio para administrarlo
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : condominiums.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 px-8 py-16 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">
            Aún no tienes condominios
          </p>
          {(appUser?.role === "admin" || appUser?.role === "administrator") && (
            <Link
              href="/condominium/new"
              className="h-10 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Crear condominio
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {condominiums.map((c) => (
            <Link
              key={c.id}
              href={`/condominium/${c.id}`}
              className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {c.name}
                </h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                    c.status === "complete"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {c.status === "complete" ? "Completo" : "Borrador"}
                </span>
              </div>
              {c.address && (
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {c.address}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
