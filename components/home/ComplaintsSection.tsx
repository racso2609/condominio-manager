"use client";

import Link from "next/link";
import { Complaint, AppUser, ComplaintStatus } from "@/lib/types";

interface ComplaintsSectionProps {
  complaints: Complaint[];
  complaintAuthors: Record<string, AppUser>;
  condominiumNames: Record<string, string>;
}

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  resolved: "Resuelta",
};

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  in_progress:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  resolved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export function ComplaintsSection({
  complaints,
  complaintAuthors,
  condominiumNames,
}: ComplaintsSectionProps) {
  return (
    <section aria-labelledby="complaints-heading">
      <div className="mb-4">
        <h2
          id="complaints-heading"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Quejas
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Mantente informado sobre los reportes de tus condominios
        </p>
      </div>

      {complaints.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center dark:border-zinc-800 dark:bg-black">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            No hay quejas registradas
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Los residentes podrán publicar reportes desde el detalle del condominio
          </p>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-4">
            {complaints.slice(0, 10).map((complaint) => {
              const author = complaintAuthors[complaint.author];
              return (
                <Link
                  key={complaint.id}
                  href={`/condominium/${complaint.condominium}/complaints`}
                  className="flex w-[300px] shrink-0 flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700 sm:w-[320px] lg:w-[360px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {complaint.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        STATUS_COLORS[complaint.status]
                      }`}
                    >
                      {STATUS_LABELS[complaint.status]}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-zinc-500">
                    {complaint.content}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="truncate">
                      {condominiumNames[complaint.condominium] ?? "Condominio"}
                    </span>
                    <span>
                      {author?.name ?? ""}
                      {author ? " · " : ""}
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
