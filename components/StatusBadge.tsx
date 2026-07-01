export default function StatusBadge({ status }: { status: "draft" | "complete" }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
        status === "complete"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      }`}
    >
      {status === "complete" ? "Completo" : "Borrador"}
    </span>
  );
}
