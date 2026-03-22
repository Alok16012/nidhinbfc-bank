import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLoanID } from "@/lib/utils";
import { calculateEMI, calculateFlatEMI } from "@/lib/utils/emi-calculator";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const memberId = searchParams.get("member_id");

  let query = supabase
    .from("loans")
    .select("*, member:members(name, phone, member_id)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (memberId) query = query.eq("member_id", memberId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { amount, interest_rate, tenure_months, repayment_type } = body;

  const result = repayment_type === "flat"
    ? calculateFlatEMI(amount, interest_rate, tenure_months)
    : calculateEMI(amount, interest_rate, tenure_months);

  const { data, error } = await supabase
    .from("loans")
    .insert({
      ...body,
      loan_id: generateLoanID(),
      status: "pending",
      disbursed_amount: 0,
      emi_amount: result.emi,
      outstanding_balance: amount,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
