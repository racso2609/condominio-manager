"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useAuthContext } from "@/context/authContext";
import { createCondominium } from "@/lib/services/condominiumService";

export default function NewCondominium() {
  const { appUser } = useAuthContext();
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canCreate = appUser?.role === "admin" || appUser?.role === "administrator";

  if (!canCreate) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
        <div className="flex flex-col items-center gap-6 rounded-xl border border-zinc-200 bg-white px-8 py-20 text-center dark:border-zinc-800 dark:bg-black">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sin permisos
          </h1>
          <p className="max-w-sm text-zinc-500 dark:text-zinc-400">
            Solo los administradores pueden crear condominios.
          </p>
          <Button href="/home" variant="secondary" size="lg">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const condo = await createCondominium({
        name: name.trim(),
        address: address.trim(),
        creator: appUser!.id,
      });
      router.push(`/condominium/${condo.id}`);
    } catch {
      setError("Ocurrió un error al crear el condominio. Intenta de nuevo.");
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
        <span className="text-zinc-900 dark:text-zinc-50">Nuevo condominio</span>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-black">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Crear nuevo condominio
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Registra un nuevo condominio para comenzar a gestionarlo.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Nombre del condominio
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Residencial Los Pinos"
              required
              className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
            />
          </div>

          <div>
            <label
              htmlFor="address"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Dirección
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Av. Principal #123, Ciudad"
              required
              className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={submitting || !name.trim() || !address.trim()}
              variant="primary"
              size="lg"
              className="h-11 px-8 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Creando..." : "Crear condominio"}
            </Button>
            <Button
              href="/home"
              variant="secondary"
              size="lg"
              className="h-11 px-6"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
