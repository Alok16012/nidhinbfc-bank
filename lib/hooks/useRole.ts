import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "admin" | "manager" | "staff";

export interface RoleInfo {
  role: UserRole;
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
      const rawRole = (meta.role as string) ?? "staff";
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

      // Fetch additional details from staff table
      const { data: staffData } = await supabase
        .from("staff")
        .select("name, phone, department, employee_id, join_date")
        .eq("user_id", user.id)
        .single();

      if (staffData) {
        setName(staffData.name);
      } else {
        setName(meta.name ?? meta.full_name ?? (mappedRole === "admin" ? "Admin" : email.split("@")[0]));
      }

      setLoading(false);
    });
  }, [supabase]);

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isStaff = role === "staff";

  return {
    role,
    name,
    email,
    userId,
    loading,
    isAdmin,
    isManager,
    isStaff,

    canCreateLoan: true,
    canApproveLoan: isAdmin || isManager,
    canDisburseLoan: isAdmin,

    canRecordCollection: true,
    canConfirmCollection: isAdmin || isManager,
    canRecordPayment: isAdmin || isManager,

    canCreateDeposit: true,
    canWithdrawDeposit: isAdmin || isManager,

    canCreateMember: true,
    canEditSettings: isAdmin,
  };
}
