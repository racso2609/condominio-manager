import Link from "next/link";

interface PermissionDeniedProps {
  message: string;
  backHref?: string;
}

export function PermissionDenied({ message, backHref }: PermissionDeniedProps) {
  if (backHref) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
        <div className="flex flex-col items-center gap-6 rounded-xl border border-zinc-200 bg-white px-8 py-20 text-center dark:border-zinc-800 dark:bg-black">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sin permisos
          </h1>
          <p className="max-w-sm text-zinc-500 dark:text-zinc-400">
            {message}
          </p>
          <Link
            href={backHref}
            className="h-10 rounded-full border border-zinc-200 px-6 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-4">
      <p className="text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}
