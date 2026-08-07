import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

  const name = data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0] ?? "Current user";
  const role = data.user.user_metadata?.role ?? "admin";

  return (
    <AppShell
      title="Account management"
      description="Create and manage user access for staff, admins, and super admins."
    >
      <AccountsWorkspace
        accounts={[
          {
            id: data.user.id,
            name,
            email: data.user.email ?? "No email available",
            role,
            status: "Active",
            joined: "Current account",
          },
        ]}
      />
    </AppShell>
  );
}
