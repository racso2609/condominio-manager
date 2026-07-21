export function EmptyState({ message }: { message: string }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-black">
      <p className="text-zinc-500 dark:text-zinc-400">{message}</p>
    </section>
  );
}
