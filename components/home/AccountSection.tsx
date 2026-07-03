"use client";

import { Button } from "@/components/Button";
import { User } from "@supabase/supabase-js";
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
                src={
                  user.user_metadata?.avatar_url ??
                  user.user_metadata?.picture ??
                  undefined
                }
                alt=""
                className="h-10 w-10 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {appUser?.name ??
                    user.user_metadata?.full_name ??
                    user.user_metadata?.name ??
                    "Usuario"}
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
          <Button href="/profile" variant="secondary" size="md">
            Perfil
          </Button>
          <Button onClick={logout} variant="secondary" size="md">
            Cerrar sesión
          </Button>
        </div>
      </header>
    </section>
  );
}
