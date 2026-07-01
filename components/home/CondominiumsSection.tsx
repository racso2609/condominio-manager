"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { Condominium, AppUser } from "@/lib/types";

interface CondominiumsSectionProps {
  condominiums: Condominium[];
  loading: boolean;
  appUser: AppUser | null | undefined;
}

export function CondominiumsSection({
  condominiums,
  loading,
  appUser,
}: CondominiumsSectionProps) {
  return (
    <section aria-labelledby="condominiums-heading">
      <div className="mb-4">
        <h1
          id="condominiums-heading"
          className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
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
          {(appUser?.role === "admin" ||
            appUser?.role === "administrator") && (
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
                <span className="shrink-0">
                  <StatusBadge status={c.status} />
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
    </section>
  );
}
