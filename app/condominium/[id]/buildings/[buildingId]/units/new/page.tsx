"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { generateUnits } from "@/lib/services/unitService";

export default function GenerateUnits() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [floors, setFloors] = useState("");
  const [unitsPerFloor, setUnitsPerFloor] = useState("");
  const [unitType, setUnitType] = useState<"residential" | "office">("residential");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canCreate =
    appUser?.role === "admin" || appUser?.role === "administrator";

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
    const f = parseInt(floors, 10);
    const u = parseInt(unitsPerFloor, 10);
    if (isNaN(f) || isNaN(u) || f < 1 || u < 1) return;
    setSubmitting(true);
    setError("");

    try {
      await generateUnits(params.buildingId as string, f, u, unitType);
      router.push(`/condominium/${params.id}/buildings/${params.buildingId}`);
    } catch {
      setError("Ocurrió un error al generar las unidades. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  const preview = (() => {
    const f = parseInt(floors, 10);
    const u = parseInt(unitsPerFloor, 10);
    if (isNaN(f) || isNaN(u) || f < 1 || u < 1) return null;
    const rows: { floor: number; nums: string[] }[] = [];
    for (let fi = 0; fi < f; fi++) {
      const nums: string[] = [];
      for (let ui = 0; ui < u; ui++) {
        nums.push(`${fi + 1}${ui + 1}`);
      }
      rows.push({ floor: fi, nums });
    }
    return rows;
  })();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/home"
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
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
        <span className="text-zinc-900 dark:text-zinc-50">
          Generar unidades
        </span>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-black">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Generar unidades
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Define la cantidad de pisos y unidades por piso para generarlas
          automáticamente.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="floors"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Cantidad de pisos
              </label>
              <input
                id="floors"
                type="number"
                value={floors}
                onChange={(e) => setFloors(e.target.value)}
                placeholder="Ej: 3"
                required
                min="1"
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
              />
            </div>

            <div>
              <label
                htmlFor="unitsPerFloor"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Unidades por piso
              </label>
              <input
                id="unitsPerFloor"
                type="number"
                value={unitsPerFloor}
                onChange={(e) => setUnitsPerFloor(e.target.value)}
                placeholder="Ej: 4"
                required
                min="1"
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tipo de unidades
            </label>
            <div className="flex gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50 dark:border-zinc-700 dark:has-[:checked]:border-zinc-50 dark:has-[:checked]:bg-zinc-900">
                <input
                  type="radio"
                  name="unitType"
                  value="residential"
                  checked={unitType === "residential"}
                  onChange={() => setUnitType("residential")}
                  className="accent-zinc-900 dark:accent-zinc-50"
                />
                Habitacional
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50 dark:border-zinc-700 dark:has-[:checked]:border-zinc-50 dark:has-[:checked]:bg-zinc-900">
                <input
                  type="radio"
                  name="unitType"
                  value="office"
                  checked={unitType === "office"}
                  onChange={() => setUnitType("office")}
                  className="accent-zinc-900 dark:accent-zinc-50"
                />
                Oficina
              </label>
            </div>
          </div>

          {preview && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Vista prevía — {floors} pisos × {unitsPerFloor} unidades ={" "}
                {parseInt(floors) * parseInt(unitsPerFloor)} unidades
              </p>
              <div className="flex flex-col gap-2">
                {[...preview].reverse().map((row) => (
                  <div
                    key={row.floor}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-6 text-right text-xs text-zinc-400">
                      {row.floor}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {row.nums.map((n) => (
                        <span
                          key={n}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs font-mono text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !floors.trim() || !unitsPerFloor.trim()}
              className="h-11 rounded-full bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {submitting
                ? "Generando..."
                : `Generar ${preview ? parseInt(floors) * parseInt(unitsPerFloor) : ""} unidades`}
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
