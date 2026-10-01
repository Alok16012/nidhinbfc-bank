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
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Add it in Vercel → Project → Settings → " +
          "Environment Variables (or .env.local when running locally), then redeploy.",
      },
      { status: 503 }
    );
  }

  const adminClient = createServerClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { email, password, name, role, staff_id } = await request.json();

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

  // Link the login to its staff record, so their branch and permissions are
  // found by login id even if the email on the record changes later
  if (staff_id && data.user) {
    const { error: linkError } = await adminClient
      .from("staff")
      .update({ user_id: data.user.id, email })
      .eq("id", staff_id);
    if (linkError) {
      return NextResponse.json(
        { error: `Login created, but linking it to the staff record failed: ${linkError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
