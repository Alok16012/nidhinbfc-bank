import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALL_PERMISSIONS, resolvePermissions, type Permission } from "@/lib/permissions";

export type UserRole = "admin" | "manager" | "staff";

export interface RoleInfo {
  role: UserRole;
  /** Role name the admin typed for this staff member, e.g. "Cashier". */
  roleName: string;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  name: string;
  email: string;
  userId: string;
  loading: boolean;

  isAdmin: boolean;   // Full access
  isManager: boolean;   // Approve + confirm
  isStaff: boolean;   // Record only

  // Loan permissions
  canCreateLoan: boolean;  // all roles
  canApproveLoan: boolean;  // manager + admin
  canDisburseLoan: boolean;  // admin only

  // Collection permissions
  canRecordCollection: boolean;  // all roles
  canConfirmCollection: boolean;  // manager + admin
  canRecordPayment: boolean;  // manager + admin (alias for loan payment modal)
  canCollectDirectly: boolean; // collections count straight away, no confirmation

  // Deposit permissions
  canCreateDeposit: boolean;  // all roles
  canWithdrawDeposit: boolean; // manager + admin

  // Member & Settings
  canCreateMember: boolean;  // all roles
  canEditSettings: boolean;  // admin only
}

/* The signed-in user's role is loaded ONCE per page load and shared by every
   component that asks for it (sidebar, bottom nav, every Can, every page).
   Before this each useRole() call made its own auth + staff request, so a
   list with 50 Edit buttons fired 100 requests and every page sat on
   "Loading..." until they came back. The result is also kept in
   sessionStorage, so a reload or the next page shows the right buttons
   immediately while a fresh copy is fetched in the background. */

interface RoleState {
  role: UserRole;
  roleName: string;
  permissions: Permission[];
  name: string;
  email: string;
  userId: string;
  loading: boolean;
}

const EMPTY: RoleState = { role: "staff", roleName: "", permissions: [], name: "", email: "", userId: "", loading: true };
const CACHE_KEY = "nidhi.role.v1";

const roleMap: Record<string, UserRole> = {
  admin: "admin",
  manager: "manager",
  staff: "staff",
  loan_officer: "manager",
  accountant: "manager",
  cashier: "staff",
  clerk: "staff",
};

let state: RoleState = readCache() ?? EMPTY;
let fetching: Promise<void> | null = null;
const listeners = new Set<() => void>();

function readCache(): RoleState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoleState;
    return { ...parsed, loading: false };
  } catch { return null; }
}

function writeCache(s: RoleState) {
  try { window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...s, loading: false })); } catch { /* private mode */ }
}

function setState(next: RoleState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

async function loadRole(): Promise<void> {
  const supabase = createClient();
  // The session is already in the browser (cookie/local storage): no network
  // round trip, unlike getUser(). The database still checks every request.
  const { data: { session } } = await supabase.auth.getSession();
  let user = session?.user ?? null;
  if (!user) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }
  if (!user) {
    setState({ ...EMPTY, loading: false });
    return;
  }

  const meta = user.user_metadata ?? {};
  // app_metadata can only be set by the server, so it wins over
  // user_metadata, which users can edit themselves; admin is never
  // taken from user_metadata
  const metaRole = meta.role === "admin" ? "staff" : (meta.role as string | undefined);
  const rawRole = (user.app_metadata?.role as string) ?? metaRole ?? "staff";
  const mappedRole = roleMap[rawRole] ?? "staff";

  // If a cached copy exists for this user, show it now and refresh quietly
  if (state.userId !== user.id || state.loading) {
    const cached = readCache();
    if (cached && cached.userId === user.id) setState(cached);
  }

  // Staff record: name, typed role name and permissions. Older staff rows
  // are linked to their login by email rather than user_id.
  const { data: staffData } = await supabase
    .from("staff")
    .select("name, role, permissions")
    .or(`user_id.eq.${user.id},email.eq."${user.email ?? ""}"`)
    .limit(1)
    .maybeSingle();

  const next: RoleState = {
    role: mappedRole,
    roleName: staffData?.role ?? rawRole,
    permissions: mappedRole === "admin" ? ALL_PERMISSIONS : resolvePermissions(staffData?.permissions, staffData?.role ?? rawRole),
    name: staffData?.name ?? meta.name ?? meta.full_name ?? (mappedRole === "admin" ? "Admin" : (user.email ?? "").split("@")[0]),
    email: user.email ?? "",
    userId: user.id ?? "",
    loading: false,
  };
  writeCache(next);
  setState(next);
}

let authWatched = false;

function ensureLoaded() {
  if (!authWatched && typeof window !== "undefined") {
    authWatched = true;
    // One listener for the whole app: sign-in / sign-out or a token refresh changes who we are
    createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") resetRoleCache();
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") ensureLoaded();
    });
  }
  if (fetching) return fetching;
  fetching = loadRole().catch(() => setState({ ...state, loading: false })).finally(() => { fetching = null; });
  return fetching;
}

/** Forget the cached role (call on sign-out or when permissions change). */
export function resetRoleCache() {
  try { window.sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
  setState(EMPTY);
}

export function useRole(): RoleInfo {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Kick off the single shared load (a no-op once it has run)
  useEffect(() => { ensureLoaded(); }, []);

  const isAdmin = s.role === "admin";
  const isManager = s.role === "manager";
  const isStaff = s.role === "staff";
  const can = (permission: Permission) => isAdmin || s.permissions.includes(permission);

  return {
    role: s.role,
    roleName: s.roleName,
    permissions: s.permissions,
    can,
    name: s.name,
    email: s.email,
    userId: s.userId,
    loading: s.loading,
    isAdmin,
    isManager,
    isStaff,

    canCreateLoan: can("loans.create"),
    canApproveLoan: can("loans.approve"),
    canDisburseLoan: can("loans.disburse"),

    canRecordCollection: can("collection.deposit") || can("collection.loan"),
    canConfirmCollection: can("collection.confirm"),
    canRecordPayment: can("loans.payment"),
    canCollectDirectly: can("collection.direct"),

    canCreateDeposit: can("deposits.create"),
    canWithdrawDeposit: can("deposits.withdraw"),

    canCreateMember: can("members.manage"),
    canEditSettings: isAdmin,
  };
}
