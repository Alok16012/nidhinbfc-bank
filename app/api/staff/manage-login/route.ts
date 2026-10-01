import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";

// Login of a staff member: linked by user_id, or for older rows by email
async function findLoginId(client: SupabaseClient, staff: { user_id: string | null; email: string | null }) {
  if (staff.user_id) return staff.user_id;
  if (!staff.email) return null;
  const email = staff.email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * POST { staff_id, action: "set_password", password }
 *      { staff_id, action: "remove_login" }   delete the login, keep the staff record
 *      { staff_id, action: "delete_staff" }   delete the login and the staff record
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminClient();
  if (!admin.client) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const client = admin.client;

  const { staff_id, action, password } = await request.json();
  if (!staff_id || !["set_password", "remove_login", "delete_staff"].includes(action)) {
    return NextResponse.json({ error: "staff_id and a valid action are required" }, { status: 400 });
  }

  const { data: staff } = await client.from("staff").select("id, user_id, email").eq("id", staff_id).maybeSingle();
  if (!staff) return NextResponse.json({ error: "Staff record not found" }, { status: 404 });

  const loginId = await findLoginId(client, staff);

  if (action === "set_password") {
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!loginId) return NextResponse.json({ error: "This staff member has no login yet. Create one first." }, { status: 404 });
    const { error } = await client.auth.admin.updateUserById(loginId, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!staff.user_id) await client.from("staff").update({ user_id: loginId }).eq("id", staff.id);
    return NextResponse.json({ success: true });
  }

  if (loginId) {
    const { error } = await client.auth.admin.deleteUser(loginId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (action === "remove_login") {
    await client.from("staff").update({ user_id: null }).eq("id", staff.id);
    return NextResponse.json({ success: true, hadLogin: !!loginId });
  }

  const { error } = await client.from("staff").delete().eq("id", staff.id);
  if (error) return NextResponse.json({ error: `Login removed, but the staff record could not be deleted: ${error.message}` }, { status: 400 });
  return NextResponse.json({ success: true });
}
