"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useAuthContext } from "@/context/authContext";
import { useCreateBuilding } from "@/lib/mutations/useBuildingMutations";
import { PermissionDenied } from "@/components/PermissionDenied";

export default function NewBuilding() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const { mutate: createBuilding, isPending: submitting } = useCreateBuilding();

  const canCreate = appUser?.role === "admin" || appUser?.role === "administrator";

  if (!canCreate) {
    return (
      <PermissionDenied message="Solo los administradores pueden gestionar edificios." backHref={`/condominium/${params.id}`} />
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) return;
    setError("");

    createBuilding(
      {
        condominium: params.id as string,
        name: name.trim(),
        symbol: symbol.trim(),
        address: address.trim() || undefined,
      },
      {
        onSuccess: () => router.push(`/condominium/${params.id}`),
        onError: () =>
          setError("Ocurrió un error al crear el edificio. Intenta de nuevo."),
      }
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: "Condominio", href: `/condominium/${params.id}` },
          { label: "Nuevo edificio" },
        ]}
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-black">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Registrar nuevo edificio
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Agrega un edificio al condominio para luego registrar sus unidades.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Nombre del edificio
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Edificio A"
                required
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
              />
            </div>

            <div>
              <label
                htmlFor="symbol"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Símbolo
              </label>
              <input
                id="symbol"
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Ej: A, B, 1, 2"
                required
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="address"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Dirección (opcional)
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Calle Secundaria #45"
              className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !name.trim() || !symbol.trim()}
              className="h-11 rounded-full bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {submitting ? "Creando..." : "Crear edificio"}
            </button>
            <Link
              href={`/condominium/${params.id}`}
              className="flex h-11 items-center rounded-full border border-zinc-200 px-6 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
