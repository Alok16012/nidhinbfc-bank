"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Loan {
  id: string;
  loan_id: string;
  member_id: string;
  member?: { name: string; phone: string; member_id: string };
  loan_type: string;
  amount: number;
  disbursed_amount: number;
  interest_rate: number;
  tenure_months: number;
  repayment_type: string;
  purpose: string;
  status: "pending" | "approved" | "disbursed" | "closed" | "npa";
  emi_amount: number;
  outstanding_balance: number;
  next_due_date?: string;
  disbursed_at?: string;
  closed_at?: string;
  guarantor_name?: string;
  guarantor_phone?: string;
  collateral?: string;
  created_at: string;
}

export function useLoans(memberId?: string) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("loans")
      .select("*, member:members(name, phone, member_id)")
      .order("created_at", { ascending: false });

    if (memberId) query = query.eq("member_id", memberId);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setLoans((data as Loan[]) || []);
    setLoading(false);
  }, [memberId, supabase]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  return { loans, loading, error, refetch: fetchLoans };
}
