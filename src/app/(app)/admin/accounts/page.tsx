import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/current-user";
import { getUserAccounts } from "@/server/services/user-accounts";

import { AccountsWorkspace } from "./accounts-workspace";

export const metadata = {
  title: "Accounts | Erda Scholar System",
};

export default async function AccountsPage() {
  // Auth + shell come from the shared (app) layout; this page only enforces
  // the server-verified admin gate and loads its own data. The segment
  // loading.tsx shows a centered skeleton while getUserAccounts() runs.
  const user = await requireCurrentUser();

  if (user.role && !["admin", "super_admin"].includes(user.role)) {
    redirect("/dashboard");
  }

  const canCreateAccounts = ["admin", "super_admin"].includes(user.role ?? "");
  const accounts = await getUserAccounts();

  return <AccountsWorkspace accounts={accounts} canCreateAccounts={canCreateAccounts} />;
}
