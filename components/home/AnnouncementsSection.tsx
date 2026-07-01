"use client";

import AnnouncementPreview from "@/components/AnnouncementPreview";
import { Announcement, AppUser } from "@/lib/types";

interface AnnouncementsSectionProps {
  announcements: Announcement[];
  announcementAuthors: Record<string, AppUser>;
}

export function AnnouncementsSection({
  announcements,
  announcementAuthors,
}: AnnouncementsSectionProps) {
  return (
    <section aria-labelledby="announcements-heading">
      <div className="mb-4">
        <h2
          id="announcements-heading"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Noticias y anuncios
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Mantente informado sobre las últimas novedades de tus condominios
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            No hay noticias ni anuncios
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tus administradores publicarán novedades aquí
          </p>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-4">
            {announcements.slice(0, 10).map((ann) => (
              <div
                key={ann.id}
                className="w-[300px] shrink-0 sm:w-[320px] lg:w-[360px]"
              >
                <AnnouncementPreview
                  announcement={ann}
                  author={announcementAuthors[ann.author]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
