"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { getBuilding, duplicateBuilding } from "@/lib/services/buildingService";
import { FormSkeleton } from "@/components/skeleton";

export default function DuplicateBuilding() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canEdit = appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!params.buildingId) return;
    getBuilding(params.buildingId as string).then((b) => {
      if (!b) router.replace(`/condominium/${params.id}`);
      else {
        setName(`${b.name} (copia)`);
        setSymbol(b.symbol);
        setAddress(b.address ?? "");
      }
      setLoading(false);
    });
  }, [params.buildingId, params.id, router]);

  if (!canEdit) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
        <div className="flex flex-col items-center gap-6 rounded-xl border border-zinc-200 bg-white px-8 py-20 text-center dark:border-zinc-800 dark:bg-black">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sin permisos
          </h1>
          <p className="max-w-sm text-zinc-500 dark:text-zinc-400">
            Solo los administradores pueden duplicar edificios.
          </p>
          <Link
            href={`/condominium/${params.id}`}
            className="h-10 rounded-full border border-zinc-200 px-6 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <FormSkeleton titleWidth="w-48" inputCount={3} />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const b = await duplicateBuilding(params.buildingId as string, {
        condominium: params.id as string,
        name: name.trim(),
        symbol: symbol.trim(),
        address: address.trim() || undefined,
      });
      router.push(`/condominium/${params.id}/buildings/${b.id}`);
    } catch {
      setError("Ocurrió un error al duplicar el edificio. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

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
        <Link
          href={`/condominium/${params.id}/buildings/${params.buildingId}`}
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Edificio
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">Duplicar</span>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-black">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Duplicar edificio
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Se copiarán todas las unidades del edificio original.
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
              {submitting ? "Duplicando..." : "Duplicar edificio"}
            </button>
            <Link
              href={`/condominium/${params.id}/buildings/${params.buildingId}`}
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
