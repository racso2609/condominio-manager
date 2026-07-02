"use client";

import { Skeleton, SkeletonButton, SkeletonCard, SkeletonText } from "./Skeleton";

interface FormSkeletonProps {
  titleWidth?: string;
  inputCount?: number;
  buttonCount?: number;
}

export function FormSkeleton({
  titleWidth = "w-56",
  inputCount = 4,
  buttonCount = 2,
}: FormSkeletonProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <SkeletonText className="w-24" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-28" />
        <SkeletonText className="w-2" />
        <SkeletonText className="w-20" />
      </div>

      <div>
        <Skeleton className={cx("h-8 rounded-lg", titleWidth)} />
      </div>

      <SkeletonCard>
        <div className="flex flex-col gap-6">
          {Array.from({ length: inputCount }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <SkeletonText className="w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          {Array.from({ length: buttonCount }).map((_, i) => (
            <SkeletonButton key={i} className={i === 0 ? "w-32" : "w-24"} />
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
