"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import {
  getCondominium,
  getCondominiumRoles,
  verifyRole,
} from "@/lib/services/condominiumService";
import { getBuildingsByCondominium } from "@/lib/services/buildingService";
import {
  getUnitsByBuilding,
  verifyUnitOwner,
  rejectUnitClaim,
} from "@/lib/services/unitService";
import { getUser } from "@/lib/services/userService";
import { Condominium, CondominiumRole, Building, Unit, AppUser } from "@/lib/types";
import Collapse from "@/components/Collapse";

export default function ResidentsPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [roles, setRoles] = useState<CondominiumRole[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [pendingUnits, setPendingUnits] = useState<Unit[]>([]);
  const [unitsByOwner, setUnitsByOwner] = useState<Record<string, Unit[]>>({});
  const [owners, setOwners] = useState<Record<string, AppUser>>({});
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!params.id) return;
    const id = params.id as string;
    Promise.all([
      getCondominium(id),
      getCondominiumRoles(id),
      getBuildingsByCondominium(id),
    ]).then(async ([c, r, b]) => {
      if (!c) {
        router.replace("/home");
        return;
      }
      setCondominium(c);
      setRoles(r);
      setBuildings(b);

      const pending: Unit[] = [];
      const ownerIds = new Set<string>();
      const byOwner: Record<string, Unit[]> = {};

      for (const building of b) {
        const units = await getUnitsByBuilding(building.id);
        for (const u of units) {
          if (u.owner) {
            if (!byOwner[u.owner]) byOwner[u.owner] = [];
            byOwner[u.owner].push(u);
            ownerIds.add(u.owner);
          }
          if (u.owner_status === "pending") {
            pending.push(u);
          }
        }
      }
      setPendingUnits(pending);
      setUnitsByOwner(byOwner);

      const ownerMap: Record<string, AppUser> = {};
      for (const oid of ownerIds) {
        const owner = await getUser(oid);
        if (owner) ownerMap[oid] = owner;
      }
      setOwners(ownerMap);
      setLoading(false);
    });
  }, [params.id, router]);

  const handleReject = async (unitId: string) => {
    if (!window.confirm("¿Rechazar esta solicitud? El usuario no podrá reclamar esta unidad por 1 semana.")) return;
    setRejecting(unitId);
    try {
      await rejectUnitClaim(unitId);
      setPendingUnits((prev) => prev.filter((u) => u.id !== unitId));
    } catch {
      alert("Error al rechazar");
    } finally {
      setRejecting(null);
    }
  };

  const handleVerify = async (unitId: string, roleId: string) => {
    setVerifying(unitId);
    try {
      await verifyUnitOwner(unitId);
      await verifyRole(roleId);
      setPendingUnits((prev) => prev.filter((u) => u.id !== unitId));
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId ? { ...r, status: "verified" as const } : r
        )
      );
    } catch {
      alert("Error al validar");
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <div className="h-48 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!condominium) return null;

  if (!isAdminOrManager) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-zinc-500 dark:text-zinc-400">
          No tienes permisos para gestionar residentes.
        </p>
      </div>
    );
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
        <span className="text-zinc-900 dark:text-zinc-50">Residentes</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Gestionar residentes
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {condominium.name}
        </p>
      </div>

      {pendingUnits.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Solicitudes pendientes ({pendingUnits.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingUnits.map((u) => {
              const owner = owners[u.owner];
              const building = buildings.find((b) => b.id === u.building);
              const role = roles.find(
                (r) => r.user === u.owner
              );
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900 dark:bg-amber-900/20"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {owner?.name ?? "Usuario desconocido"}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {owner?.email ?? ""} — {building?.name ?? ""} / Unidad{" "}
                      {u.num}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {role && (
                      <button
                        onClick={() => handleVerify(u.id, role.id)}
                        disabled={verifying === u.id}
                        className="h-9 rounded-full bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {verifying === u.id ? "Validando..." : "Validar"}
                      </button>
                    )}
                    <button
                      onClick={() => handleReject(u.id)}
                      disabled={rejecting === u.id}
                      className="h-9 rounded-full border border-red-300 px-5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {rejecting === u.id ? "..." : "Rechazar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pendingUnits.length === 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            No hay solicitudes pendientes.
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Residentes ({roles.filter((r) => r.role === "resident").length})
        </h2>
        <div className="flex flex-col gap-2">
          {roles
            .filter((r) => r.role === "resident")
            .map((r) => {
              const owner = owners[r.user] ?? null;
              const units = unitsByOwner[r.user] ?? [];
              return (
                <Collapse
                  key={r.id}
                  title={owner?.name ?? r.invited_email ?? "Pendiente"}
                  subtitle={
                    owner?.email
                      ? [owner.email, owner.phone].filter(Boolean).join(" · ")
                      : r.invited_email ?? ""
                  }
                  badge={
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                        r.status === "verified"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {r.status === "verified" ? "Verificado" : "Pendiente"}
                    </span>
                  }
                >
                  {units.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                      Sin unidades asignadas
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {units.map((u) => {
                        const building = buildings.find(
                          (b) => b.id === u.building
                        );
                        return (
                          <div
                            key={u.id}
                            className="flex items-center gap-3 rounded-lg bg-zinc-50 px-4 py-2.5 dark:bg-zinc-900"
                          >
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              {building?.name ?? "?"} / {u.num}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                u.type === "residential"
                                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}
                            >
                              {u.type === "residential" ? "Hab." : "Ofi."}
                            </span>
                            <span
                              className={`ml-auto text-[10px] font-medium ${
                                u.owner_status === "verified"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {u.owner_status === "verified"
                                ? "Verificado"
                                : "Pendiente"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Collapse>
              );
            })}
        </div>
      </section>
    </div>
  );
}
