"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthContext } from "@/context/authContext";
import { Button } from "@/components/Button";
import { AppInviteSkeleton } from "@/components/skeleton";
import { useInviteByToken } from "@/lib/queries/useCondominium";
import { useCondominium } from "@/lib/queries/useCondominium";
import { useAcceptInvite } from "@/lib/mutations/useCondominiumMutations";

function InviteContent() {
  const { user, appUser, login, loading: authLoading } = useAuthContext();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [error, setError] = useState(
    token ? "" : "Token de invitación no encontrado"
  );
  const [done, setDone] = useState(false);

  const { data: role, isLoading: roleLoading } = useInviteByToken(
    token ?? undefined
  );
  const { data: condominium, isLoading: condoLoading } = useCondominium(
    role?.condominium
  );

  const { mutate: acceptInvite, isPending: accepting } = useAcceptInvite();

  const loading = roleLoading || condoLoading || authLoading;

  const isInvalid =
    !token ||
    (!roleLoading && !role) ||
    (role?.expires_at && role.expires_at.toMillis() < Date.now()) ||
    (role?.invited_email && role.user);

  if (loading) {
    return <AppInviteSkeleton />;
  }

  if (error || isInvalid) {
    const message = error || role?.invited_email && role.user
      ? "Invitación ya fue aceptada"
      : role?.expires_at && role.expires_at.toMillis() < Date.now()
        ? "Invitación expirada"
        : "Invitación no válida o ya fue utilizada";

    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
        </div>
        <Button href="/" variant="primary" size="lg">
          Ir al inicio
        </Button>
      </div>
    );
  }

  const handleAccept = () => {
    if (!token || !appUser) return;
    if (role?.invited_email && role.invited_email !== appUser.email) {
      setError(
        `Esta invitación fue enviada a ${role.invited_email}. Inicia sesión con esa cuenta.`
      );
      return;
    }

    acceptInvite(
      { token, userId: appUser.id },
      {
        onSuccess: () => setDone(true),
        onError: (e) =>
          setError(e instanceof Error ? e.message : "Error al aceptar invitación"),
      }
    );
  };

  if (done) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 dark:border-emerald-900 dark:bg-emerald-900/20">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            ¡Invitación aceptada!
          </p>
          <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-300">
            Ya eres parte de {condominium?.name ?? "el condominio"}. Ahora puedes
            reclamar una unidad.
          </p>
        </div>
        <Button
          href={`/condominium/${role?.condominium}`}
          variant="primary"
          size="lg"
        >
          Ir al condominio
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-black">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Invitación a condominio
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Has sido invitado a{" "}
          <strong>{condominium?.name ?? "un condominio"}</strong>
          {role?.invited_email && (
            <> como residente ({role.invited_email})</>
          )}
        </p>

        {!user ? (
          <div className="mt-6">
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Inicia sesión para aceptar la invitación
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => login?.("google")}
            >
              Iniciar sesión con Google
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            {role?.invited_email && role.invited_email !== appUser?.email ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400">
                Esta invitación fue enviada a {role.invited_email}. Cierra sesión
                y entra con esa cuenta.
              </div>
            ) : (
              <Button
                onClick={handleAccept}
                disabled={accepting}
                variant="primary"
                size="lg"
              >
                {accepting ? "Aceptando..." : "Aceptar invitación"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<AppInviteSkeleton />}>
      <InviteContent />
    </Suspense>
  );
}
