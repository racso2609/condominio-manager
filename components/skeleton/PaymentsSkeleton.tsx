"use client";

import { Skeleton, SkeletonCard, SkeletonText } from "./Skeleton";

export function PaymentsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <SkeletonText className="w-24" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-32" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-24" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <SkeletonText className="w-48" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="p-5">
            <SkeletonText className="w-16" />
            <Skeleton className="mt-2 h-8 w-28 rounded-lg" />
          </SkeletonCard>
        ))}
      </div>

      {/* Payment items */}
      <section className="flex flex-col gap-3">
        <SkeletonText className="w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40 rounded-lg" />
                <SkeletonText className="w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </section>

      {/* Payment methods */}
      <section className="flex flex-col gap-3">
        <SkeletonText className="w-40" />
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <SkeletonText className="mt-1 w-28" />
            <div className="mt-3 flex flex-col gap-2">
              <SkeletonText className="w-2/3" />
              <SkeletonText className="w-1/2" />
            </div>
          </SkeletonCard>
        ))}
      </section>
    </div>
  );
}
