"use client";

import { useEffect, useState, useMemo } from "react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@/components/PageHeader";
import { useCondominiumPage } from "@/hooks/useCondominiumPage";
import { useCondominiumRoles } from "@/lib/queries/useCondominium";
import { useBuildingsByCondominium } from "@/lib/queries/useBuilding";
import {
  useCreateInvite,
  useCreateGlobalInvite,
  useDeleteCondominiumRole,
} from "@/lib/mutations/useCondominiumMutations";
import { CondominiumRole } from "@/lib/types";
import { InviteSkeleton } from "@/components/skeleton";
import { PermissionDenied } from "@/components/PermissionDenied";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

export default function InviteResidentPage() {
  const {
    appUser,
    condominiumId,
    condominium,
    condominiumLoading,
    isCondoAdmin,
  } = useCondominiumPage();
  const { data: roles = [], isLoading: rolesLoading } =
    useCondominiumRoles(condominiumId);
  const { data: buildings = [] } = useBuildingsByCondominium(condominiumId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"resident" | "administrator">("resident");
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [lastLink, setLastLink] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const toggleBuilding = (buildingId: string) => {
    setSelectedBuildings((prev) =>
      prev.includes(buildingId)
        ? prev.filter((id) => id !== buildingId)
        : [...prev, buildingId]
    );
  };

  const { mutate: createInvite, isPending: sending } = useCreateInvite();
  const { mutate: createGlobalInvite, isPending: generatingGlobal } =
    useCreateGlobalInvite();
  const { mutate: deleteCondominiumRole, isPending: deletingRole } =
    useDeleteCondominiumRole();

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isExpired = (role: CondominiumRole) =>
    !!role.expires_at && new Date(role.expires_at).getTime() < now;

  const tokenRoles = useMemo(
    () => roles.filter((role) => role.token),
    [roles]
  );

  const globalInvite = tokenRoles.find(
    (r) => !r.invited_email && r.token && !isExpired(r)
  );
  const globalLink = globalInvite
    ? `${BASE_URL}/invite?token=${globalInvite.token}`
    : "";

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !appUser || !condominium) return;
    if (role === "administrator" && selectedBuildings.length === 0) {
      alert("Selecciona al menos una torre para el encargado.");
      return;
    }

    createInvite(
      {
        condominiumId: condominium.id,
        invitedBy: appUser.id,
        email: email.trim(),
        role,
        buildings: role === "administrator" ? selectedBuildings : undefined,
      },
      {
        onSuccess: (createdRole) => {
          setLastLink(`${BASE_URL}/invite?token=${createdRole.token}`);
          setEmail("");
          setSelectedBuildings([]);
        },
      }
    );
  };

  const handleCreateGlobalInvite = () => {
    if (!appUser || !condominium) return;

    createGlobalInvite({
      condominiumId: condominium.id,
      invitedBy: appUser.id,
    });
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${BASE_URL}/invite?token=${token}`);
  };

  const handleDeleteInvite = (roleId: string, emailOrLabel: string) => {
    if (
      !window.confirm(
        `¿Eliminar la invitación para "${emailOrLabel}"? El enlace dejará de funcionar.`
      )
    ) {
      return;
    }
    deleteCondominiumRole(roleId, {
      onError: () => alert("Error al eliminar la invitación"),
    });
  };

  const pendingInvites = useMemo(
    () => tokenRoles.filter((r) => !r.user && !isExpired(r)),
    [tokenRoles, now]
  );
  const pastInvites = useMemo(
    () => tokenRoles.filter((r) => r.user || isExpired(r)),
    [tokenRoles, now]
  );

  const loading = condominiumLoading || rolesLoading;

  if (loading) {
    return <InviteSkeleton />;
  }

  if (!condominium) return null;

  if (!isCondoAdmin) {
    return (
      <PermissionDenied message="No tienes permisos para invitar residentes." />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominium.id}` },
          { label: "Invitar" },
        ]}
      />

      <PageHeader title="Invitar residente" subtitle={condominium.name} />

      <form onSubmit={handleInvite} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo del invitado"
            required
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="h-10 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            {sending ? "Enviando..." : "Invitar"}
          </button>
        </div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Rol
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "resident" | "administrator")
              }
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-500"
            >
              <option value="resident">Residente</option>
              <option value="administrator">Encargado de torre</option>
            </select>
          </label>
        </div>

        {role === "administrator" && (
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Torres que administrará
            </p>
            {buildings.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Este condominio aún no tiene torres.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {buildings.map((b) => {
                  const active = selectedBuildings.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBuilding(b.id)}
                      className={
                        active
                          ? "rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                          : "rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </form>

      {lastLink && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Link de invitación generado
          </p>
          <div className="mt-2 flex gap-2">
            <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-zinc-700 dark:bg-black dark:text-zinc-300">
              {lastLink}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(lastLink)}
              className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Invitación grupal
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Genera un link que puedes compartir en un grupo para que cualquier
          persona se una al condominio.
        </p>
        {globalLink ? (
          <div className="mt-4 flex gap-2">
            <code className="flex-1 truncate rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {globalLink}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(globalLink)}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Copiar
            </button>
          </div>
        ) : (
          <button
            onClick={handleCreateGlobalInvite}
            disabled={generatingGlobal}
            className="mt-4 h-10 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            {generatingGlobal ? "Generando..." : "Generar link grupal"}
          </button>
        )}
      </div>

      {pendingInvites.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Invitaciones pendientes ({pendingInvites.length})
          </h2>
          <div className="flex flex-col gap-2">
            {pendingInvites.map((r) => {
              const label = r.invited_email ?? "Link grupal";
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-black"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {label}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {r.role === "administrator"
                        ? "Encargado de torre"
                        : "Residente"}{" "}
                      ·{" "}
                      {r.expires_at
                        ? `Expira el ${new Date(r.expires_at).toLocaleDateString()}`
                        : "Sin fecha de expiración"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.token && (
                      <button
                        type="button"
                        onClick={() => copyLink(r.token!)}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        Copiar link
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteInvite(r.id, label)}
                      disabled={deletingRole}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pastInvites.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Historial de invitaciones ({pastInvites.length})
          </h2>
          <div className="flex flex-col gap-2">
            {pastInvites.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-black"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {r.invited_email ?? "Link grupal"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {r.user ? "Aceptada" : "Expirada"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
