"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Member {
  id: string;
  member_id: string;
  name: string;
  phone: string;
  email?: string;
  dob: string;
  address: string;
  nominee_name: string;
  nominee_relation: string;
  aadhar?: string;
  pan?: string;
  aadhar_url?: string;
  pan_url?: string;
  share_capital: number;
  status: "active" | "inactive" | "suspended";
  photo_url?: string;
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
