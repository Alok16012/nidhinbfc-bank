"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { routePermission } from "@/lib/permissions";

/** Shows the page only if the signed-in user has the permission it needs. */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdmin, can, loading } = useRole();
  const need = routePermission(pathname);

  if (!need) return <>{children}</>;
  if (loading) return <div className="py-16 text-center text-slate-400">Loading...</div>;

  const allowed = need === "admin" ? isAdmin : can(need);
  if (allowed) return <>{children}</>;

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <ShieldOff className="h-6 w-6 text-slate-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800">No access</h2>
      <p className="mt-1 text-sm text-slate-500">
        Your role doesn&apos;t include this page. Ask your admin to give you access from the Staff page.
      </p>
      <Link href="/dashboard" className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
        Go to dashboard
      </Link>
    </div>
  );
}
