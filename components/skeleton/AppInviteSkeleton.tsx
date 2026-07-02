"use client";

import { Skeleton, SkeletonButton, SkeletonCard, SkeletonText } from "./Skeleton";

export function AppInviteSkeleton() {
  return (
    <div className="mx-auto flex max-w-lg flex-1 items-center justify-center px-4">
      <SkeletonCard className="w-full p-8 text-center">
        <Skeleton className="mx-auto h-7 w-48 rounded-lg" />
        <SkeletonText className="mx-auto mt-2 w-56" />
        <div className="mt-6 flex flex-col items-center gap-3">
          <SkeletonText className="mx-auto w-40" />
          <SkeletonButton className="mx-auto w-48" />
        </div>
      </SkeletonCard>
    </div>
  );
}
