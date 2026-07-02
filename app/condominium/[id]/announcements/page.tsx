"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/authContext";
import { Button } from "@/components/Button";
import { getCondominium } from "@/lib/services/condominiumService";
import {
  getAnnouncementsByCondominium,
  deleteAnnouncement,
} from "@/lib/services/announcementService";
import { getUser } from "@/lib/services/userService";
import { Condominium, Announcement, AppUser } from "@/lib/types";

export default function AnnouncementsPage() {
  const { appUser } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [authors, setAuthors] = useState<Record<string, AppUser>>({});
  const [loading, setLoading] = useState(true);
  const isAdminOrManager =
    appUser?.role === "admin" || appUser?.role === "administrator";

  useEffect(() => {
    if (!params.id) return;
    const id = params.id as string;
    Promise.all([getCondominium(id), getAnnouncementsByCondominium(id)]).then(
      async ([c, a]) => {
        if (!c) router.replace("/home");
        else {
          setCondominium(c);
          setAnnouncements(a);
          const ids = new Set(a.map((ann) => ann.author));
          const map: Record<string, AppUser> = {};
          for (const uid of ids) {
            const u = await getUser(uid);
            if (u) map[uid] = u;
          }
          setAuthors(map);
        }
        setLoading(false);
      },
    );
  }, [params.id, router]);

  const handleDelete = async (announcement: Announcement) => {
    if (
      !window.confirm(
        `¿Eliminar "${announcement.title}"? Esta acción no se puede deshacer.`,
      )
    )
      return;
    try {
      await deleteAnnouncement(announcement.id, params.id as string);
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
    } catch {
      alert("Error al eliminar");
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
        <span className="text-zinc-900 dark:text-zinc-50">Anuncios</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Anuncios
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {condominium.name}
          </p>
        </div>
        {isAdminOrManager && (
          <Button
            href={`/condominium/${condominium.id}/announcements/new`}
            variant="primary"
            size="lg"
          >
            Nuevo anuncio
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-zinc-500 dark:text-zinc-400">
            No hay anuncios publicados.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          {announcements.map((ann) => {
            const author = authors[ann.author];
            const images = ann.files?.filter((f) => f.type === "image") ?? [];
            const docs = ann.files?.filter((f) => f.type === "document") ?? [];
            return (
              <div
                key={ann.id}
                className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {ann.title}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {author?.name ?? "Desconocido"} ·{" "}
                      {ann.created_at.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  {isAdminOrManager && (
                    <button
                      onClick={() => handleDelete(ann)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                  {ann.content}
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
                    {docs.map((doc, i) => (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          PDF
                        </div>
                        <span className="truncate">{doc.name}</span>
                      </a>
                    ))}
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
