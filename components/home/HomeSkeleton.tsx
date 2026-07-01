"use client";

export function HomeSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-8">
      <section>
        <div className="mb-4 h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mb-4 h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-9 w-32 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mb-4 h-4 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex gap-4 overflow-x-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 w-[300px] shrink-0 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 sm:w-[320px] lg:w-[360px]"
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 h-6 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mb-4 h-4 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mb-4 h-4 w-72 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </section>
    </div>
  );
}
