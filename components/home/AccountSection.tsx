"use client";

import Link from "next/link";
import { User } from "firebase/auth";
import { AppUser } from "@/lib/types";

interface AccountSectionProps {
  user: User | null | undefined;
  appUser: AppUser | null | undefined;
  logout: () => void;
}

export function AccountSection({
  user,
  appUser,
  logout,
}: AccountSectionProps) {
  return (
    <section aria-labelledby="account-heading">
      <div className="mb-4">
        <h2
          id="account-heading"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Mi cuenta
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Gestiona tu perfil y sesión
        </p>
      </div>

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
                  {appUser?.name ?? user.displayName}
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

        <div className="flex gap-2">
          <Link
            href="/profile"
            className="h-9 rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Perfil
          </Link>
          <button
            onClick={logout}
            className="h-9 rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
    </section>
  );
}
