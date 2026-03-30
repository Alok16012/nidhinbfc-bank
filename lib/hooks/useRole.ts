import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "admin" | "manager" | "staff";

export interface RoleInfo {
  role: UserRole;
  name: string;
  email: string;
  userId: string;
  loading: boolean;

  isAdmin:   boolean;   // Full access
  isManager: boolean;   // Approve + confirm
  isStaff:   boolean;   // Record only

  // Loan permissions
  canCreateLoan:   boolean;  // all roles
  canApproveLoan:  boolean;  // manager + admin
  canDisburseLoan: boolean;  // admin only

  // Collection permissions
  canRecordCollection:  boolean;  // all roles
  canConfirmCollection: boolean;  // manager + admin
  canRecordPayment:     boolean;  // manager + admin (alias for loan payment modal)

  // Deposit permissions
  canCreateDeposit:  boolean;  // all roles
  canWithdrawDeposit: boolean; // manager + admin

  // Member & Settings
  canCreateMember: boolean;  // all roles
  canEditSettings: boolean;  // admin only
}

export function useRole(): RoleInfo {
  const supabase = createClient();
  const [role, setRole]       = useState<UserRole>("staff");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [userId, setUserId]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {};
      const rawRole = (meta.role as string) ?? "staff";
      // Map legacy role names to new 3-tier system
      const roleMap: Record<string, UserRole> = {
        admin:        "admin",
        manager:      "manager",
        staff:        "staff",
        loan_officer: "manager",
        accountant:   "manager",
        cashier:      "staff",
        clerk:        "staff",
      };
      setRole(roleMap[rawRole] ?? "staff");
      setName(meta.name ?? meta.full_name ?? "");
      setEmail(data.user?.email ?? "");
      setUserId(data.user?.id ?? "");
      setLoading(false);
    });
  }, []);

  const isAdmin   = role === "admin";
  const isManager = role === "manager";
  const isStaff   = role === "staff";

  return {
    role,
    name,
    email,
    userId,
    loading,
    isAdmin,
    isManager,
    isStaff,

    canCreateLoan:        true,
    canApproveLoan:       isAdmin || isManager,
    canDisburseLoan:      isAdmin,

    canRecordCollection:  true,
    canConfirmCollection: isAdmin || isManager,
    canRecordPayment:     isAdmin || isManager,

    canCreateDeposit:     true,
    canWithdrawDeposit:   isAdmin || isManager,

    canCreateMember:      true,
    canEditSettings:      isAdmin,
  };
}
