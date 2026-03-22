import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDepositID } from "@/lib/utils";
import { calculateFDInterest, calculateRDMaturity } from "@/lib/utils/interest-calculator";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type");
  const memberId = searchParams.get("member_id");

  let query = supabase
    .from("deposits")
    .select("*, member:members(name, phone, member_id)")
    .order("created_at", { ascending: false });

  if (type) query = query.eq("deposit_type", type);
  if (memberId) query = query.eq("member_id", memberId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { amount, interest_rate, tenure_months, deposit_type } = body;

  let maturityAmount = null;
  let maturityDate = null;

  if (deposit_type === "fd" || deposit_type === "mis") {
    const result = calculateFDInterest(amount, interest_rate, tenure_months);
    maturityAmount = result.maturityAmount;
    const d = new Date();
    d.setMonth(d.getMonth() + tenure_months);
    maturityDate = d.toISOString().split("T")[0];
  } else if (deposit_type === "rd") {
    const result = calculateRDMaturity(amount, interest_rate, tenure_months);
    maturityAmount = result.maturityAmount;
    const d = new Date();
    d.setMonth(d.getMonth() + tenure_months);
    maturityDate = d.toISOString().split("T")[0];
  }

  const { data, error } = await supabase
    .from("deposits")
    .insert({
      ...body,
      deposit_id: generateDepositID(),
      current_balance: amount,
      status: "active",
      maturity_date: maturityDate,
      maturity_amount: maturityAmount,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
