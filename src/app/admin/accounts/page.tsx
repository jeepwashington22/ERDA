import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserAccounts } from "@/server/services/user-accounts";

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
  const { data: callerProfile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const canCreateAccounts = ["admin", "super_admin"].includes(callerProfile?.role ?? "");
  const accounts = await getUserAccounts();

  return (
    <AppShell
      title="Account management"
      description="Create and manage user access for staff, admins, and super admins."
    >
      <AccountsWorkspace accounts={accounts} canCreateAccounts={canCreateAccounts} />
    </AppShell>
  );
}