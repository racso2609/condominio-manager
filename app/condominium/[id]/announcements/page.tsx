"use client";

import { useMemo } from "react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@/components/PageHeader";
import { useCondominiumPage } from "@/hooks/useCondominiumPage";
import { Button } from "@/components/Button";
import { useAnnouncementsByCondominium } from "@/lib/queries/useAnnouncement";
import { useUsers } from "@/lib/queries/useUser";
import { useDeleteAnnouncement } from "@/lib/mutations/useAnnouncementMutations";
import { Announcement } from "@/lib/types";
import { PageSkeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/EmptyState";

export default function AnnouncementsPage() {
  const {
    condominiumId,
    condominium,
    condominiumLoading,
    isAdminOrManager,
  } = useCondominiumPage();
  const { data: announcements = [], isLoading: announcementsLoading } =
    useAnnouncementsByCondominium(condominiumId);

  const authorIds = useMemo(
    () => Array.from(new Set(announcements.map((a) => a.author))),
    [announcements]
  );
  const usersQueries = useUsers(authorIds);

  const authors = useMemo(() => {
    const map: Record<string, import("@/lib/types").AppUser> = {};
    usersQueries.forEach((q) => {
      if (q.data) map[q.data.id] = q.data;
    });
    return map;
  }, [usersQueries]);

  const { mutate: deleteAnnouncement, isPending: isDeleting } =
    useDeleteAnnouncement();

  const handleDelete = (announcement: Announcement) => {
    if (
      !window.confirm(
        `¿Eliminar "${announcement.title}"? Esta acción no se puede deshacer.`
      )
    )
      return;

    deleteAnnouncement(announcement.id);
  };

  const loading = condominiumLoading || announcementsLoading;

  if (loading || !condominium) {
    return <PageSkeleton titleWidth="w-40" cardCount={3} cardLines={4} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Mis condominios", href: "/home" },
          { label: condominium.name, href: `/condominium/${condominium.id}` },
          { label: "Anuncios" },
        ]}
      />

      <PageHeader
        title="Anuncios"
        subtitle={condominium.name}
        action={
          isAdminOrManager ? (
            <Button
              href={`/condominium/${condominium.id}/announcements/new`}
              variant="primary"
              size="lg"
            >
              Nuevo anuncio
            </Button>
          ) : undefined
        }
      />

      {announcements.length === 0 ? (
        <EmptyState message="No hay anuncios publicados." />
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
                      {new Date(ann.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {isAdminOrManager && (
                    <button
                      onClick={() => handleDelete(ann)}
                      disabled={isDeleting}
                      className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
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
