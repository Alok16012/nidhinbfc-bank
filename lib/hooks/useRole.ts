import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "admin" | "manager" | "accountant" | "loan_officer" | "cashier" | "clerk";

export interface RoleInfo {
  role: UserRole;
  name: string;
  email: string;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  canApproveLoan: boolean;   // manager + admin
  canDisburseLoan: boolean;  // admin only
  canRecordPayment: boolean; // admin + accountant
}

export function useRole(): RoleInfo {
  const supabase = createClient();
  const [role, setRole] = useState<UserRole>("admin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {};
      setRole((meta.role as UserRole) ?? "admin");
      setName(meta.name ?? meta.full_name ?? "");
      setEmail(data.user?.email ?? "");
      setLoading(false);
    });
  }, []);

  const isAdmin = role === "admin";
  const isManager = role === "manager";

  return {
    role,
    name,
    email,
    loading,
    isAdmin,
    isManager,
    canApproveLoan: isAdmin || isManager || role === "loan_officer",
    canDisburseLoan: isAdmin,
    canRecordPayment: isAdmin || role === "accountant" || role === "cashier",
  };
}
