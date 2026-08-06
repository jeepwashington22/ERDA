import { redirect } from "next/navigation";

import { AuthPortal } from "@/components/auth-portal";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata = {
  title: "Login | Erda Scholar System",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string | string[] };
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ?? {};
  const nextValue = Array.isArray(resolvedSearchParams.next)
    ? resolvedSearchParams.next[0]
    : resolvedSearchParams.next;

  return <AuthPortal redirectTo={nextValue ?? "/dashboard"} />;
}