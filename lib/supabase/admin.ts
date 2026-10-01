import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";

type AdminResult = { client: SupabaseClient; error?: never } | { client?: never; error: string; status: number };

// Project ref from the Supabase URL, e.g. "abcd" from https://abcd.supabase.co
function urlProjectRef(url: string): string | null {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

// Project ref inside a legacy JWT service key; new-style sb_secret_ keys
// carry none, so they can't be checked this way.
function keyProjectRef(key: string): string | null {
  const payload = key.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).ref ?? null;
  } catch {
    return null;
  }
}

/**
 * Service-role client for login management, for signed-in admins only.
 * Refuses a service key from a different Supabase project than the app uses,
 * which would otherwise create logins in that other project.
 */
export async function getAdminClient(opts: { requireAdmin?: boolean } = { requireAdmin: true }): Promise<AdminResult> {
  if (opts.requireAdmin !== false) {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (user?.app_metadata?.role !== "admin") {
      return { error: "Only an admin can manage staff logins", status: 403 };
    }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || serviceRoleKey === "your-service-role-key" || !supabaseUrl) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Add it in Vercel → Project → Settings → " +
        "Environment Variables (or .env.local when running locally), then redeploy.",
      status: 503,
    };
  }

  const appRef = urlProjectRef(supabaseUrl);
  const keyRef = keyProjectRef(serviceRoleKey);
  if (appRef && keyRef && appRef !== keyRef) {
    return {
      error:
        `SUPABASE_SERVICE_ROLE_KEY belongs to a different Supabase project (${keyRef}) than the app uses (${appRef}). ` +
        `Copy the service_role key from the ${appRef} project's API settings into Vercel, then redeploy.`,
      status: 500,
    };
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}
