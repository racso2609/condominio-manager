"use client";

import { ReactNode } from "react";
import { Skeleton, SkeletonButton, SkeletonCard, SkeletonText } from "./Skeleton";

interface PageSkeletonProps {
  titleWidth?: string;
  subtitle?: boolean;
  action?: boolean;
  actionCount?: number;
  statsCount?: number;
  cardCount?: number;
  cardLines?: number;
  children?: ReactNode;
}

export function PageSkeleton({
  titleWidth = "w-48",
  subtitle = true,
  action = true,
  actionCount = 1,
  statsCount = 0,
  cardCount = 4,
  cardLines = 3,
  children,
}: PageSkeletonProps) {
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className={cx("h-8 rounded-lg", titleWidth)} />
          {subtitle && <SkeletonText className="w-56" />}
        </div>
        {action && (
          <div className="flex gap-2">
            {Array.from({ length: actionCount }).map((_, i) => (
              <SkeletonButton key={i} />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {statsCount > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: statsCount }).map((_, i) => (
            <SkeletonCard key={i} className="p-5">
              <SkeletonText className="w-16" />
              <Skeleton className="mt-2 h-8 w-24 rounded-lg" />
            </SkeletonCard>
          ))}
        </div>
      )}

      {/* Body */}
      {children ?? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: cardCount }).map((_, i) => (
            <SkeletonCard key={i}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-2/3 rounded-lg" />
                  <SkeletonText className="w-1/2" />
                </div>
                <Skeleton className="h-6 w-20 rounded-lg" />
              </div>
              {cardLines > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {Array.from({ length: cardLines }).map((_, j) => (
                    <SkeletonText
                      key={j}
                      className={j === cardLines - 1 ? "w-2/3" : "w-full"}
                    />
                  ))}
                </div>
              )}
            </SkeletonCard>
          ))}
        </div>
      )}
    </div>
  );
}

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
