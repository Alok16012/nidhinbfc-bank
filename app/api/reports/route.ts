import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const report = searchParams.get("report");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  switch (report) {
    case "members": {
      const { data, error } = await supabase.from("members").select("*").order("created_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    case "active_loans": {
      const { data, error } = await supabase
        .from("loans")
        .select("*, member:members(name, phone, member_id)")
        .eq("status", "disbursed");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    case "overdue": {
      const { data, error } = await supabase
        .from("loan_repayments")
        .select("*, loan:loans(loan_id, member:members(name, phone))")
        .eq("status", "overdue")
        .order("due_date");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    case "maturing_deposits": {
      const days = parseInt(searchParams.get("days") ?? "30");
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const { data, error } = await supabase
        .from("deposits")
        .select("*, member:members(name, phone, member_id)")
        .eq("status", "active")
        .lte("maturity_date", futureDate.toISOString().split("T")[0])
        .gte("maturity_date", new Date().toISOString().split("T")[0]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    case "expenses": {
      let query = supabase.from("expenses").select("*").order("date", { ascending: false });
      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    default:
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }
}
