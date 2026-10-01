import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readBranchCookie } from "@/lib/branch";
import { useRole } from "@/lib/hooks/useRole";

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  is_head_office: boolean;
  status: "active" | "inactive";
}

export interface BranchInfo {
  /** Branches this user can see: all for admin, their own for staff. */
  branches: Branch[];
  /** The branch the app is showing, or null when an admin views all branches. */
  current: Branch | null;
  isAllBranches: boolean;
  loading: boolean;
}

export function useBranch(): BranchInfo {
  const supabase = createClient();
  const { isAdmin, loading: roleLoading } = useRole();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("branches")
      .select("*")
      .order("is_head_office", { ascending: false })
      .order("name")
      .then(({ data }) => {
        setBranches((data as Branch[]) || []);
        setLoading(false);
      });
  }, [supabase]);

  // Admin: the switcher cookie decides. Staff: the database only returns their
  // own branch, so that is the one being shown.
  const selectedId = readBranchCookie();
  const current = isAdmin
    ? branches.find((b) => b.id === selectedId) ?? null
    : branches[0] ?? null;

  return {
    branches,
    current,
    isAllBranches: isAdmin && !current,
    loading: loading || roleLoading,
  };
}
