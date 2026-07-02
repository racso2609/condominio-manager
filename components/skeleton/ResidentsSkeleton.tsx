"use client";

import { Skeleton, SkeletonAvatar, SkeletonButton, SkeletonCard, SkeletonText } from "./Skeleton";

export function ResidentsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <SkeletonText className="w-24" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-32" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-28" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <SkeletonText className="w-48" />
      </div>

      {/* Pending requests */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48 rounded-lg" />
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard
            key={i}
            className="flex items-center gap-4 border-amber-200 bg-amber-50 py-4 dark:border-amber-900 dark:bg-amber-900/20"
          >
            <SkeletonAvatar className="h-12 w-12" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40 rounded" />
              <SkeletonText className="w-56" />
            </div>
            <div className="flex gap-2">
              <SkeletonButton />
              <SkeletonButton className="w-20" />
            </div>
          </SkeletonCard>
        ))}
      </section>

      {/* Residents list */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40 rounded-lg" />
                <SkeletonText className="w-48" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </section>
    </div>
  );
}
