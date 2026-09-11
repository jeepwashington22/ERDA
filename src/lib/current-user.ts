import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { queryPostgres } from "@/server/lib/postgres";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string | null;
};

/**
 * Resolve the signed-in user plus their profile (name, role) for this server
 * render. React cache() dedupes the Supabase + Postgres lookups so the (app)
 * layout and any page needing authorization data share one round trip.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  let fullName: string | null = null;
  let role: string | null = null;
  try {
    const rows = await queryPostgres<{ full_name: string | null; role: string }>(
      "select full_name, role from user_profiles where id = $1 limit 1",
      [data.user.id],
    );
    fullName = rows[0]?.full_name ?? null;
    role = rows[0]?.role ?? null;
  } catch {
    // Missing or unreachable profile row: fall back to auth data only.
  }

  return { id: data.user.id, email: data.user.email ?? "", fullName, role };
});

/** Same as getCurrentUser but redirects unauthenticated visitors to /login. */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
