"use client";

import { useAuthContext } from "@/context/authContext";

export default function Home() {
  const { user, logout } = useAuthContext();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 rounded-xl border border-zinc-200 bg-white px-8 py-12 shadow-sm dark:border-zinc-800 dark:bg-black sm:px-16 sm:py-16">
        {user && (
          <div className="flex flex-col items-center gap-3">
            <img
              src={user.photoURL ?? undefined}
              alt=""
              className="h-14 w-14 rounded-full"
            />
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              {user.displayName}
            </p>
          </div>
        )}

        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Panel de Gestión - Condominio
        </h1>
        <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
          Bienvenido al sistema de gestión. Selecciona una opción para comenzar.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={logout}
            className="h-10 rounded-full border border-zinc-200 px-6 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
