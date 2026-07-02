"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { useCondominium, useCondominiumRoles } from "@/lib/queries/useCondominium";
import {
  useCreateInvite,
  useCreateGlobalInvite,
} from "@/lib/mutations/useCondominiumMutations";
import { CondominiumRole } from "@/lib/types";
import { InviteSkeleton } from "@/components/skeleton";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

export default function InviteResidentPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const condominiumId = params.id as string;

  const { data: condominium, isLoading: condominiumLoading } =
    useCondominium(condominiumId);
  const { data: roles = [], isLoading: rolesLoading } =
    useCondominiumRoles(condominiumId);

  const [email, setEmail] = useState("");
  const [lastLink, setLastLink] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const { mutate: createInvite, isPending: sending } = useCreateInvite();
  const { mutate: createGlobalInvite, isPending: generatingGlobal } =
    useCreateGlobalInvite();

  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!condominiumLoading && condominium === null) {
      router.replace("/home");
    }
  }, [condominiumLoading, condominium, router]);

  const isExpired = (role: CondominiumRole) =>
    !!role.expires_at && role.expires_at.toMillis() < now;

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

    createInvite(
      {
        condominiumId: condominium.id,
        invitedBy: appUser.id,
        email: email.trim(),
      },
      {
        onSuccess: (role) => {
          setLastLink(`${BASE_URL}/invite?token=${role.token}`);
          setEmail("");
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

  const copyFromRole = (role: CondominiumRole) => {
    if (role.token) copyLink(role.token);
  };

  const loading = condominiumLoading || rolesLoading;

  if (loading) {
    return <InviteSkeleton />;
  }

  if (!condominium) return null;

  if (!isAdminOrManager) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
        <p className="text-zinc-500 dark:text-zinc-400">
          No tienes permisos para invitar residentes.
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
        <span className="text-zinc-900 dark:text-zinc-50">Invitar</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Invitar residente
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {condominium.name}
        </p>
      </div>

      <form onSubmit={handleInvite} className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo del residente"
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

      {tokenRoles.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Invitaciones enviadas
          </h2>
          <div className="flex flex-col gap-2">
            {tokenRoles.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-black"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {r.invited_email ?? "Link grupal"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {r.user
                      ? "Aceptada"
                      : isExpired(r)
                        ? "Expirada"
                        : r.expires_at
                          ? `Pendiente — expira ${r.expires_at.toDate().toLocaleDateString()}`
                          : "Pendiente"}
                  </p>
                </div>
                {r.token && !isExpired(r) && (!r.user || !r.invited_email) && (
                  <button
                    onClick={() => copyFromRole(r)}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Copiar link
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
