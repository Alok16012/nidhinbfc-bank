import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const admin = await getAdminClient();
  if (!admin.client) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const adminClient = admin.client;

  const { email, password, name, role, staff_id } = await request.json();

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "email, password, name, role are required" }, { status: 400 });
  }

  // The staff record must exist in this project before we make its login
  if (staff_id) {
    const { data: staffRow } = await adminClient.from("staff").select("id").eq("id", staff_id).maybeSingle();
    if (!staffRow) {
      return NextResponse.json(
        { error: "Staff record not found in this Supabase project. Check that SUPABASE_SERVICE_ROLE_KEY is this project's key." },
        { status: 400 }
      );
    }
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
    const { data: linked, error: linkError } = await adminClient
      .from("staff")
      .update({ user_id: data.user.id, email })
      .eq("id", staff_id)
      .select("id");
    if (linkError || !linked?.length) {
      // Don't leave a login that no staff record points to
      await adminClient.auth.admin.deleteUser(data.user.id);
      return NextResponse.json(
        { error: `Could not link the login to the staff record${linkError ? `: ${linkError.message}` : ""}. No login was created.` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
