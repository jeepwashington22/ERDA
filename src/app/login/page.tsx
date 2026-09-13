import { redirect } from "next/navigation";

import { AuthPortal } from "@/components/auth-portal";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata = {
  title: "Login | Erda Scholar System",
};

type LoginPageProps = {
  searchParams?: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const nextValue = Array.isArray(resolvedSearchParams.next)
    ? resolvedSearchParams.next[0]
    : resolvedSearchParams.next;

  return <AuthPortal redirectTo={nextValue ?? "/dashboard"} assumeSignedOut />;
}
