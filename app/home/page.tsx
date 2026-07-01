"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { getUserCondominiums, getPendingInvitesByEmail } from "@/lib/services/condominiumService";
import { getAnnouncementsByCondominium } from "@/lib/services/announcementService";
import { getUser } from "@/lib/services/userService";
import { Condominium, CondominiumRole, Announcement, AppUser } from "@/lib/types";

export default function Home() {
  const { user, appUser, logout } = useAuthContext();
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CondominiumRole[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementAuthors, setAnnouncementAuthors] = useState<
    Record<string, AppUser>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    Promise.all([
      getUserCondominiums(appUser.id, appUser.role),
      getPendingInvitesByEmail(appUser.email),
    ]).then(async ([list, invites]) => {
      setCondominiums(list);
      setPendingInvites(invites);

      const allAnnouncements: Announcement[] = [];
      const authorIds = new Set<string>();
      for (const c of list) {
        const anns = await getAnnouncementsByCondominium(c.id);
        allAnnouncements.push(...anns);
        anns.forEach((a) => authorIds.add(a.author));
      }
      allAnnouncements.sort(
        (a, b) => b.created_at.toMillis() - a.created_at.toMillis()
      );
      setAnnouncements(allAnnouncements.slice(0, 10));

      const map: Record<string, AppUser> = {};
      for (const uid of authorIds) {
        const u = await getUser(uid);
        if (u) map[uid] = u;
      }
      setAnnouncementAuthors(map);
      setLoading(false);
    });
  }, [appUser]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user && (
            <>
              <img
                src={user.photoURL ?? undefined}
                alt=""
                className="h-10 w-10 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {appUser?.name ?? user.displayName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {appUser?.role === "admin"
                    ? "Super Admin"
                    : appUser?.role === "administrator"
                      ? "Administrador"
                      : "Residente"}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href="/profile"
            className="h-9 rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Perfil
          </Link>
          <button
            onClick={logout}
            className="h-9 rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mis condominios
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Selecciona un condominio para administrarlo
        </p>
      </div>

      {!loading && pendingInvites.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-900/20">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Invitaciones pendientes ({pendingInvites.length})
          </h2>
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
                  <p className="text-xs text-zinc-500">
                    {inv.invited_email}
                  </p>
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
        </section>
      )}

      {!loading && announcements.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Últimas noticias
          </h2>
          <div className="flex flex-col gap-3">
            {announcements.map((ann) => {
              const author = announcementAuthors[ann.author];
              const images =
                ann.files?.filter((f) => f.type === "image") ?? [];
              return (
                <Link
                  key={ann.id}
                  href={`/condominium/${ann.condominium}/announcements`}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700"
                >
                  <div className="flex gap-4">
                    {images.length > 0 && (
                      <img
                        src={images[0].url}
                        alt=""
                        className="h-16 w-24 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {ann.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                        {ann.content}
                      </p>
                      <p className="mt-1.5 text-[10px] text-zinc-400">
                        {author?.name ?? ""} ·{" "}
                        {ann.created_at.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : condominiums.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 px-8 py-16 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">
            Aún no tienes condominios
          </p>
          {(appUser?.role === "admin" || appUser?.role === "administrator") && (
            <Link
              href="/condominium/new"
              className="h-10 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Crear condominio
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {condominiums.map((c) => (
            <Link
              key={c.id}
              href={`/condominium/${c.id}`}
              className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {c.name}
                </h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                    c.status === "complete"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {c.status === "complete" ? "Completo" : "Borrador"}
                </span>
              </div>
              {c.address && (
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {c.address}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
