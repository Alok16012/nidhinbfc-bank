import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const adminClient = createServerClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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
