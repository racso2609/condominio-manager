"use client";

import { Skeleton, SkeletonButton, SkeletonCard, SkeletonText } from "./Skeleton";

export function CondominiumDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <SkeletonText className="w-28" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-32" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <SkeletonText className="w-48" />
          <Skeleton className="mt-1 h-6 w-24 rounded-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton />
          <SkeletonButton className="w-32" />
        </div>
      </div>

      {/* Pending amount card */}
      <SkeletonCard className="flex items-center justify-between p-5">
        <div className="flex flex-col gap-2">
          <SkeletonText className="w-24" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <SkeletonButton />
      </SkeletonCard>

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-36 rounded-full" />
        ))}
      </div>

      {/* Buildings grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <SkeletonText className="w-24" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
