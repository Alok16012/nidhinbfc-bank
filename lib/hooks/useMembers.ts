"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Member {
  id: string;
  member_id: string;
  member_no?: string;
  // Post Info
  join_date?: string;
  form_no?: string;
  // Basic Info
  name: string;
  father_name?: string;      // guardian name
  phone: string;
  email?: string;
  dob: string;
  gender?: string;
  occupation?: string;
  education?: string;
  // Permanent Address
  address: string;
  pincode?: string;
  state?: string;
  city?: string;             // used as district
  // Current Address
  current_address?: string;
  current_pincode?: string;
  current_state?: string;
  current_district?: string;
  // Nominee
  nominee_name: string;
  nominee_relation: string;
  nominee_age?: number;
  nominee_dob?: string;
  nominee_aadhar?: string;
  nominee_pan?: string;
  // Bank
  bank_account_no?: string;
  bank_ifsc?: string;
  bank_name?: string;
  // KYC
  id_type?: string;
  id_number?: string;
  aadhar?: string;
  pan?: string;
  aadhar_url?: string;
  aadhar_back_url?: string;
  pan_url?: string;
  // Images
  photo_url?: string;
  signature_url?: string;
  fingerprint_url?: string;
  // Other
  share_capital: number;
  status: "active" | "inactive" | "suspended";
  created_at: string;
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setMembers(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refetch: fetchMembers };
}

export function useMember(id: string) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!id) return;
    supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setMember(data);
        setLoading(false);
      });
  }, [id, supabase]);

  return { member, loading };
}
