"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/context/authContext";

const PUBLIC_ROUTES = ["/", "/invite"];

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!user && !isPublic) {
      router.replace("/");
    } else if (user && pathname === "/") {
      router.replace("/home");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );
  }

  return <>{children}</>;
}
