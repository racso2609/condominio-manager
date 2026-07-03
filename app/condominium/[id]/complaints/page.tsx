"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { Button } from "@/components/Button";
import { useCondominium, useUserCondominiumRole } from "@/lib/queries/useCondominium";
import { useComplaintsByCondominium } from "@/lib/queries/useComplaint";
import { useBuildingsByCondominium } from "@/lib/queries/useBuilding";
import { useUnitsByOwners } from "@/lib/queries/useUnit";
import { useUsers } from "@/lib/queries/useUser";
import {
  useUpdateComplaintStatus,
  useDeleteComplaint,
} from "@/lib/mutations/useComplaintMutations";
import {
  Complaint,
  ComplaintStatus,
  Unit,
  Building,
} from "@/lib/types";
import { PageSkeleton } from "@/components/skeleton";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  resolved: "Resuelta",
};

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  in_progress:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  resolved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function formatUnits(
  units: Unit[],
  buildings: Record<string, Building>
): string {
  if (units.length === 0) return "";
  const labels = units
    .map((u) => {
      const symbol = buildings[u.building]?.symbol ?? "";
      return `${u.num}${symbol}`;
    })
    .sort();
  return labels.length === 1 ? `Apto ${labels[0]}` : `Aptos ${labels.join(", ")}`;
}

export default function ComplaintsPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
  const { data: userRole, isLoading: roleLoading } = useUserCondominiumRole(
    appUser?.id,
    condominiumId
  );
  const { data: complaints = [], isLoading: complaintsLoading } =
    useComplaintsByCondominium(condominiumId);
  const { data: buildings = [], isLoading: buildingsLoading } =
    useBuildingsByCondominium(condominiumId);

  const authorIds = useMemo(
    () => Array.from(new Set(complaints.map((c) => c.author))),
    [complaints]
  );

  const usersQueries = useUsers(authorIds);
  const authorUnitsQueries = useUnitsByOwners(authorIds);

  const authors = useMemo(() => {
    const map: Record<string, import("@/lib/types").AppUser> = {};
    usersQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [usersQueries]);

  const buildingsMap = useMemo(() => {
    const map: Record<string, Building> = {};
    buildings.forEach((b) => {
      map[b.id] = b;
    });
    return map;
  }, [buildings]);

  const buildingIds = useMemo(
    () => new Set(buildings.map((b) => b.id)),
    [buildings]
  );

  const authorUnits = useMemo(() => {
    const map: Record<string, Unit[]> = {};
    authorUnitsQueries.forEach((q, index) => {
      const userId = authorIds[index];
      if (!userId || !q.data) return;
      const inCondo = q.data.filter((unit) => buildingIds.has(unit.building));
      if (inCondo.length > 0) map[userId] = inCondo;
    });
    return map;
  }, [authorUnitsQueries, authorIds, buildingIds]);

  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateComplaintStatus();
  const { mutate: deleteComplaint, isPending: isDeleting } =
    useDeleteComplaint();

  const isGlobalAdmin = appUser?.role === "admin";
  const isCondoAdmin = userRole?.role === "administrator";
  const canManage = isGlobalAdmin || isCondoAdmin;
  const canCreate =
    isGlobalAdmin || (userRole?.role === "resident" && !!userRole?.user);

  useEffect(() => {
    if (condominiumLoading || roleLoading) return;
    if (condominium === null) {
      router.replace("/home");
      return;
    }
    if (!isGlobalAdmin && !userRole) {
      router.replace("/home");
    }
  }, [
    condominiumLoading,
    roleLoading,
    condominium,
    userRole,
    isGlobalAdmin,
    router,
  ]);

  const handleStatusChange = (
    complaint: Complaint,
    status: ComplaintStatus
  ) => {
    if (!appUser) return;

    updateStatus({
      id: complaint.id,
      status,
      resolverId: appUser.id,
      resolutionNotes: resolutionNotes[complaint.id],
    });
  };

  const handleDelete = (complaint: Complaint) => {
    if (
      !window.confirm(
        `¿Eliminar "${complaint.title}"? Esta acción no se puede deshacer.`
      )
    )
      return;

    deleteComplaint(complaint.id);
  };

  const loading =
    condominiumLoading ||
    roleLoading ||
    complaintsLoading ||
    buildingsLoading ||
    usersQueries.some((q) => q.isLoading) ||
    authorUnitsQueries.some((q) => q.isLoading);

  if (loading || !condominium) {
    return <PageSkeleton titleWidth="w-32" cardCount={3} cardLines={4} />;
  }

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
          href={`/condominium/${condominium.id}`}
          className="hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {condominium.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">Quejas</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Quejas
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {condominium.name}
          </p>
        </div>
        {canCreate && (
          <Button
            href={`/condominium/${condominium.id}/complaints/new`}
            variant="primary"
            size="lg"
          >
            Nueva queja
          </Button>
        )}
      </div>

      {complaints.length === 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            No hay quejas registradas.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          {complaints.map((complaint) => {
            const author = authors[complaint.author];
            const units = authorUnits[complaint.author];
            const unitsText = units ? formatUnits(units, buildingsMap) : "";
            const images =
              complaint.files?.filter((f) => f.type === "image") ?? [];
            const docs =
              complaint.files?.filter((f) => f.type === "document") ?? [];
            return (
              <div
                key={complaint.id}
                className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {complaint.title}
                      </h2>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                          STATUS_COLORS[complaint.status]
                        }`}
                      >
                        {STATUS_LABELS[complaint.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {[
                        author?.name ?? "Desconocido",
                        unitsText,
                        new Date(complaint.created_at).toLocaleDateString(),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(complaint)}
                      disabled={isDeleting}
                      className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                  {complaint.content}
                </p>

                {images.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {images.map((img, i) => (
                      <a
                        key={i}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="h-40 w-56 object-cover transition-opacity group-hover:opacity-80"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {docs.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {docs.map((d, i) => (
                      <a
                        key={i}
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          PDF
                        </div>
                        <span className="truncate">{d.name}</span>
                      </a>
                    ))}
                  </div>
                )}

                {canManage && (
                  <div className="mt-5 rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Actualizar estado
                      </span>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <select
                          value={complaint.status}
                          onChange={(e) =>
                            handleStatusChange(
                              complaint,
                              e.target.value as ComplaintStatus
                            )
                          }
                          disabled={isUpdatingStatus}
                          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="in_progress">En progreso</option>
                          <option value="resolved">Resuelta</option>
                        </select>
                        <input
                          type="text"
                          value={resolutionNotes[complaint.id] ?? ""}
                          onChange={(e) =>
                            setResolutionNotes((prev) => ({
                              ...prev,
                              [complaint.id]: e.target.value,
                            }))
                          }
                          placeholder="Notas de resolución (opcional)"
                          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
                        />
                      </div>
                    </label>
                    {complaint.status === "resolved" &&
                      complaint.resolution_notes && (
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Nota: {complaint.resolution_notes}
                        </p>
                      )}
                  </div>
                )}

                {!canManage &&
                  complaint.status === "resolved" &&
                  complaint.resolution_notes && (
                    <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <span className="font-medium">Resolución:</span>{" "}
                      {complaint.resolution_notes}
                    </div>
                  )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
