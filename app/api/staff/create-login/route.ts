import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Only a signed-in admin may create logins
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (user?.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can create staff logins" }, { status: 403 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || serviceRoleKey === "your-service-role-key" || !supabaseUrl) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured in .env.local" },
      { status: 503 }
    );
  }

  const adminClient = createServerClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { email, password, name, role } = await request.json();

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "email, password, name, role are required" }, { status: 400 });
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
    // app_metadata can't be edited by the user, so the database trusts it
    app_metadata: { role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
