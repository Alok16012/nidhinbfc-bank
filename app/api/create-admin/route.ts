import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  // No admin exists yet at setup time, so the caller can't be checked as one
  const admin = await getAdminClient({ requireAdmin: false });
  if (!admin.client) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const adminClient = admin.client;

  // This route sets up the first admin only; once one exists it is closed
  const { data: existing, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }
  if (existing.users.some((u) => u.app_metadata?.role === "admin" || u.user_metadata?.role === "admin")) {
    return NextResponse.json({ error: "An admin already exists. Ask them to add you from the Staff page." }, { status: 403 });
  }

  const { email, password, name } = await request.json();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "admin" },
    app_metadata: { role: "admin" },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
