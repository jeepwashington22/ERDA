import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserAccounts } from "@/server/services/user-accounts";
import { queryPostgres } from "@/server/lib/postgres";

import { AccountsWorkspace } from "./accounts-workspace";

export const metadata = {
  title: "Accounts | Erda Scholar System",
};

export default async function AccountsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  // Server-verified role — never trust client metadata for anything
  // authorization-related, only use it here for display purposes.
  // Uses the server-side Postgres pool so RLS on user_profiles cannot
  // hide the caller's own row, and tolerates a missing profile row.
  let callerProfile: { full_name: string | null; role: string } | null = null;
  try {
    const rows = await queryPostgres<{ full_name: string | null; role: string }>(
      "select full_name, role from user_profiles where id = $1 limit 1",
      [data.user.id],
    );
    callerProfile = rows[0] ?? null;
  } catch {
    callerProfile = null;
  }

  if (callerProfile && !["admin", "super_admin"].includes(callerProfile.role)) {
    redirect("/dashboard");
  }

  const canCreateAccounts = ["admin", "super_admin"].includes(callerProfile?.role ?? "");
  const accounts = await getUserAccounts();

  return (
    <AppShell
      title="Account management"
      description="Create and manage user access for staff, admins, and super admins."
      userRole={callerProfile?.role}
      userName={callerProfile?.full_name ?? undefined}
      userEmail={data.user.email}
    >
      <AccountsWorkspace accounts={accounts} canCreateAccounts={canCreateAccounts} />
    </AppShell>
  );
}
