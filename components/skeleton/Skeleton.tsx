"use client";

import { ReactNode } from "react";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded bg-zinc-200 dark:bg-zinc-800",
        className
      )}
    />
  );
}

export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cx("h-4 w-32 rounded", className)} />;
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cx("h-10 w-10 rounded-full", className)} />;
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cx("h-10 w-24 rounded-full", className)} />;
}

export function SkeletonCard({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black",
        className
      )}
    >
      {children}
    </div>
  );
}
