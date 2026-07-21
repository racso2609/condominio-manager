import { ReactNode } from "react";

export type BadgeColor =
  | "emerald"
  | "amber"
  | "blue"
  | "sky"
  | "red"
  | "zinc";

const COLOR_CLASSES: Record<BadgeColor, string> = {
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  amber:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export interface BadgeProps {
  color?: BadgeColor;
  uppercase?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({
  color = "zinc",
  uppercase = false,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide ${COLOR_CLASSES[color]} ${uppercase ? "uppercase" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
