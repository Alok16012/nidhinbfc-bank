// The branch an admin picked in the header switcher. It is stored in a cookie
// and sent to Supabase as the `x-branch-id` header, where the row level
// security policies use it (see supabase/migrations/branches.sql). Non-admin
// staff are always locked to their own branch by the database, whatever the
// cookie says.
export const BRANCH_COOKIE = "branch_id";
export const BRANCH_HEADER = "x-branch-id";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validBranchId(value: string | null | undefined): string | null {
  return value && UUID_RE.test(value) ? value : null;
}

export function readBranchCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${BRANCH_COOKIE}=([^;]*)`));
  return validBranchId(match ? decodeURIComponent(match[1]) : null);
}

/** Switch the admin's view to one branch (or all with `null`) and reload. */
export function switchBranch(branchId: string | null, goTo?: string) {
  document.cookie = branchId
    ? `${BRANCH_COOKIE}=${branchId}; path=/; max-age=31536000; samesite=lax`
    : `${BRANCH_COOKIE}=; path=/; max-age=0; samesite=lax`;
  // A full reload rebuilds the Supabase client with the new header and
  // refetches every page's data for the chosen branch.
  window.location.href = goTo ?? window.location.pathname + window.location.search;
}

export function branchHeaders(branchId: string | null): Record<string, string> {
  return branchId ? { [BRANCH_HEADER]: branchId } : {};
}
