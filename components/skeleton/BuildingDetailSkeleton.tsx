"use client";

import { Skeleton, SkeletonButton, SkeletonCard, SkeletonText } from "./Skeleton";

export function BuildingDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <SkeletonText className="w-24" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-24" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-28" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <SkeletonText className="w-56" />
          </div>
        </div>
        <div className="flex gap-2">
          <SkeletonButton />
          <SkeletonButton />
          <SkeletonButton className="w-20" />
        </div>
      </div>

      {/* Units toolbar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <div className="flex gap-2">
          <SkeletonButton className="w-28" />
          <SkeletonButton className="w-32" />
        </div>
      </div>

      {/* Floors */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, floor) => (
          <div key={floor}>
            <Skeleton className="mb-3 h-5 w-20 rounded-lg" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} className="py-3">
                  <Skeleton className="h-5 w-16 rounded" />
                </SkeletonCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
