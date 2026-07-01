"use client";

import Link from "next/link";
import { CondominiumRole } from "@/lib/types";

interface InvitesSectionProps {
  pendingInvites: CondominiumRole[];
}

export function InvitesSection({ pendingInvites }: InvitesSectionProps) {
  if (pendingInvites.length === 0) return null;

  return (
    <section aria-labelledby="invites-heading">
      <div className="mb-4">
        <h2
          id="invites-heading"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Invitaciones pendientes
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Acepta las invitaciones para unirte a un condominio
        </p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-900/20">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Tienes {pendingInvites.length} invitación
          {pendingInvites.length > 1 ? "es" : ""} por revisar
        </h3>
        <div className="mt-3 flex flex-col gap-2">
          {pendingInvites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-lg bg-white px-4 py-3 dark:bg-black"
            >
              <div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Has sido invitado a un condominio
                </p>
                <p className="text-xs text-zinc-500">{inv.invited_email}</p>
              </div>
              <Link
                href={`/invite?token=${inv.token}`}
                className="h-8 rounded-full bg-amber-600 px-4 text-xs font-medium text-white transition-colors hover:bg-amber-500"
              >
                Ver invitación
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
