import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing-page";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata = {
  title: "ERDA Scholar System — Make every student opportunity count",
  description:
    "A focused workspace for managing student records, yearly enrollments, and scholarship access with role-aware controls.",
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}

