"use client";

import { useState, PropsWithChildren, ReactNode } from "react";

export default function Collapse({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  isOpen,
  forceOpen,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  forceOpen?: boolean;
}>) {
  const effectiveControlled = isOpen !== undefined ? isOpen : forceOpen;
  const [prevEffective, setPrevEffective] = useState(effectiveControlled);
  const [open, setOpen] = useState(
    effectiveControlled !== undefined ? effectiveControlled : defaultOpen
  );

  if (effectiveControlled !== prevEffective) {
    setPrevEffective(effectiveControlled);
    setOpen(
      effectiveControlled !== undefined ? effectiveControlled : defaultOpen
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-90" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>
        {badge}
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          {children}
        </div>
      )}
    </div>
  );
}
