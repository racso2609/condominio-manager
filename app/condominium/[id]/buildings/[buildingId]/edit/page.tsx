"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useBuilding } from "@/lib/queries/useBuilding";
import { useCondominiumPermissions } from "@/hooks/useCondominiumPermissions";
import { useUpdateBuilding } from "@/lib/mutations/useBuildingMutations";
import { Building } from "@/lib/types";
import { FormSkeleton } from "@/components/skeleton";
import { PermissionDenied } from "@/components/PermissionDenied";

function EditBuildingForm({
  building,
  condominiumId,
}: {
  building: Building;
  condominiumId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(building.name);
  const [symbol, setSymbol] = useState(building.symbol);
  const [address, setAddress] = useState(building.address ?? "");
  const [error, setError] = useState("");

  const { mutate: updateBuilding, isPending: submitting } =
    useUpdateBuilding();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) return;
    setError("");

    updateBuilding(
      {
        id: building.id,
        data: {
          name: name.trim(),
          symbol: symbol.trim(),
          address: address.trim() || undefined,
        },
      },
      {
        onSuccess: () =>
          router.push(`/condominium/${condominiumId}/buildings/${building.id}`),
        onError: () =>
          setError(
            "Ocurrió un error al guardar los cambios. Intenta de nuevo."
          ),
      }
    );
  };

  return (
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
          {submitting ? "Guardando..." : "Guardar cambios"}
        </button>
        <Link
          href={`/condominium/${condominiumId}/buildings/${building.id}`}
          className="flex h-11 items-center rounded-full border border-zinc-200 px-6 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export default function EditBuilding() {
  const params = useParams();
  const router = useRouter();
  const buildingId = params.buildingId as string;
  const condominiumId = params.id as string;

  const { data: building, isLoading } = useBuilding(buildingId);

  const { isCondoAdmin: canEdit } = useCondominiumPermissions(condominiumId);

  if (!canEdit) {
    return (
      <PermissionDenied message="Solo los administradores pueden editar edificios." backHref={`/condominium/${condominiumId}`} />
    );
  }

  if (isLoading) {
    return <FormSkeleton titleWidth="w-40" inputCount={3} />;
  }

  if (!building) {
    router.replace(`/condominium/${condominiumId}`);
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: "Condominio", href: `/condominium/${condominiumId}` },
          {
            label: "Edificio",
            href: `/condominium/${condominiumId}/buildings/${buildingId}`,
          },
          { label: "Editar" },
        ]}
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-black">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Editar edificio
        </h1>

        <EditBuildingForm building={building} condominiumId={condominiumId} />
      </div>
    </div>
  );
}
