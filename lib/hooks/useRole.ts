import { useState, useEffect } from "react";
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

export function useRole(): RoleInfo {
  const supabase = createClient();
  const [role, setRole] = useState<UserRole>("staff");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to get cookie value
  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  useEffect(() => {
    // Check for demo access first
    const isDemo = getCookie("sb-demo-access") === "true";
    if (isDemo) {
      const dRole = (getCookie("sb-demo-role") as UserRole) || "staff";
      const dEmail = getCookie("sb-demo-email") || "demo@grihsevak.com";
      const dName = getCookie("sb-demo-name") || "Demo User";

      setRole(dRole);
      setPermissions(dRole === "admin" ? ALL_PERMISSIONS : resolvePermissions(null, dRole));
      setEmail(dEmail);
      setName(dName);
      setUserId("demo-user-id");
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const meta = user.user_metadata ?? {};
      // app_metadata can only be set by the server, so it wins over
      // user_metadata, which users can edit themselves; admin is never
      // taken from user_metadata
      const metaRole = meta.role === "admin" ? "staff" : (meta.role as string | undefined);
      const rawRole = (user.app_metadata?.role as string) ?? metaRole ?? "staff";
      const roleMap: Record<string, UserRole> = {
        admin: "admin",
        manager: "manager",
        staff: "staff",
        loan_officer: "manager",
        accountant: "manager",
        cashier: "staff",
        clerk: "staff",
      };

      const mappedRole = roleMap[rawRole] ?? "staff";
      setRole(mappedRole);
      setEmail(user.email ?? "");
      setUserId(user.id ?? "");

      // Staff record: name, typed role name and permissions. Older staff rows
      // are linked to their login by email rather than user_id.
      const { data: staffData } = await supabase
        .from("staff")
        .select("*")
        .or(`user_id.eq.${user.id},email.eq."${user.email ?? ""}"`)
        .limit(1)
        .maybeSingle();

      setName(staffData?.name ?? meta.name ?? meta.full_name ?? (mappedRole === "admin" ? "Admin" : (user.email ?? "").split("@")[0]));
      setRoleName(staffData?.role ?? rawRole);
      setPermissions(
        mappedRole === "admin" ? ALL_PERMISSIONS : resolvePermissions(staffData?.permissions, staffData?.role ?? rawRole)
      );

      setLoading(false);
    });
  }, [supabase]);

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isStaff = role === "staff";
  const can = (permission: Permission) => isAdmin || permissions.includes(permission);

  return {
    role,
    roleName,
    permissions,
    can,
    name,
    email,
    userId,
    loading,
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
