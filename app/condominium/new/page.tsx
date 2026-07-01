"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCondominium() {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/home" className="hover:text-zinc-700 dark:hover:text-zinc-200">
          Mis condominios
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">Nuevo condominio</span>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-xl border border-zinc-200 bg-white px-8 py-20 text-center dark:border-zinc-800 dark:bg-black">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Crear nuevo condominio
        </h1>
        <p className="max-w-sm text-zinc-500 dark:text-zinc-400">
          Esta funcionalidad estará disponible próximamente. Aquí podrás
          registrar un nuevo condominio agregando sus datos generales.
        </p>
        <button
          onClick={() => router.back()}
          className="h-10 rounded-full border border-zinc-200 px-6 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
