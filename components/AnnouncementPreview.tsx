"use client";

import Link from "next/link";
import { Announcement, AppUser } from "@/lib/types";

export default function AnnouncementPreview({
  announcement,
  author,
}: {
  announcement: Announcement;
  author?: AppUser | null;
}) {
  const images =
    announcement.files?.filter((f) => f.type === "image") ?? [];

  return (
    <Link
      href={`/condominium/${announcement.condominium}/announcements`}
      className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700"
    >
      {images.length > 0 && (
        <img
          src={images[0].url}
          alt=""
          className="h-20 w-28 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {announcement.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
          {announcement.content}
        </p>
        <p className="mt-1.5 text-[10px] text-zinc-400">
          {author?.name ?? ""} ·{" "}
          {announcement.created_at.toDate().toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
