"use client";

import { Skeleton, SkeletonButton, SkeletonCard, SkeletonText } from "./Skeleton";

export function InviteSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <SkeletonText className="w-24" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-32" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-20" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <SkeletonText className="w-48" />
      </div>

      {/* Email form */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <SkeletonButton />
      </div>

      {/* Global invite card */}
      <SkeletonCard>
        <Skeleton className="h-6 w-40 rounded-lg" />
        <SkeletonText className="mt-1 w-full" />
        <SkeletonButton className="mt-4 w-40" />
      </SkeletonCard>

      {/* Sent invites */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40 rounded" />
              <SkeletonText className="w-32" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </SkeletonCard>
        ))}
      </section>
    </div>
  );
}
