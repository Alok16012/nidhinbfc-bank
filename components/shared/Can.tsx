"use client";

import { useRole } from "@/lib/hooks/useRole";
import type { Permission } from "@/lib/permissions";

/** Renders its children only for users who have the given permission. */
export function Can({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { can, loading } = useRole();
  if (loading || !can(permission)) return null;
  return <>{children}</>;
}
