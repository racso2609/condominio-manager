"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { createUnit } from "@/lib/services/unitService";

export default function NewUnit() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [num, setNum] = useState("");
  const [floor, setFloor] = useState("");
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
            Solo los administradores pueden gestionar unidades.
          </p>
          <Link
            href={`/condominium/${params.id}/buildings/${params.buildingId}`}
            className="h-10 rounded-full border border-zinc-200 px-6 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const floorNum = parseInt(floor, 10);
    if (!num.trim() || isNaN(floorNum)) return;
    setSubmitting(true);
    setError("");

    try {
      await createUnit({
        building: params.buildingId as string,
        num: num.trim(),
        floor: floorNum,
      });
      router.push(`/condominium/${params.id}/buildings/${params.buildingId}`);
    } catch {
      setError("Ocurrió un error al crear la unidad. Intenta de nuevo.");
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
        <span className="text-zinc-900 dark:text-zinc-50">Nueva unidad</span>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-black">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Registrar nueva unidad
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Agrega una unidad (departamento, local, etc.) al edificio.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="num"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Número / Identificador
              </label>
              <input
                id="num"
                type="text"
                value={num}
                onChange={(e) => setNum(e.target.value)}
                placeholder="Ej: 101, A-1, PB"
                required
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
              />
            </div>

            <div>
              <label
                htmlFor="floor"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Piso
              </label>
              <input
                id="floor"
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="Ej: 1, 2, 0"
                required
                min="0"
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !num.trim() || !floor.trim()}
              className="h-11 rounded-full bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {submitting ? "Creando..." : "Crear unidad"}
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
