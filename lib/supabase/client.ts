import { createBrowserClient } from "@supabase/ssr";
import { branchHeaders, readBranchCookie } from "@/lib/branch";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";
  // The browser client is a singleton, so the branch header is fixed for the
  // page's lifetime; switchBranch() reloads the page to change it.
  return createBrowserClient(url, key, {
    global: { headers: branchHeaders(readBranchCookie()) },
  });
}
