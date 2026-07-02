"use client";

import { Skeleton, SkeletonAvatar, SkeletonButton, SkeletonCard, SkeletonText } from "./Skeleton";

export function ProfileSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <SkeletonText className="w-16" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-16" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <SkeletonText className="w-48" />
      </div>

      {/* Form */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonText className="w-20" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <SkeletonButton className="w-32" />
      </div>

      {/* Photo section */}
      <SkeletonCard className="flex items-center gap-4">
        <SkeletonAvatar className="h-14 w-14" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32 rounded" />
          <SkeletonText className="w-48" />
        </div>
      </SkeletonCard>
    </div>
  );
}
