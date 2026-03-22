import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") ?? "vouchers";
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (type === "vouchers") {
    let query = supabase.from("vouchers").select("*").order("date", { ascending: false });
    if (date) query = query.eq("date", date);
    if (from && to) query = query.gte("date", from).lte("date", to);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (type === "accounts") {
    const { data, error } = await supabase.from("accounts").select("*").eq("is_active", true).order("code");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const voucherNo = `V${Date.now().toString().slice(-6)}`;
  const { data, error } = await supabase
    .from("vouchers")
    .insert({ ...body, voucher_no: voucherNo })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
