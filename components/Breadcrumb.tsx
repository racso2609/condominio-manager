import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-3">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-zinc-900 dark:text-zinc-50">
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
