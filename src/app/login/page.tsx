import { redirect } from "next/navigation";

import { AuthPortal } from "@/components/auth-portal";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata = {
  title: "Login | Erda Scholar System",
};

type LoginPageProps = {
  searchParams?: Promise<{ next?: string | string[] }>;
};

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${light ? "bg-white text-[#635BFF]" : "bg-[#635BFF] text-white"}`}>ES</span>
      <span className={`text-sm font-bold tracking-tight ${light ? "text-white" : "text-slate-950"}`}>ERDA Scholar</span>
    </div>
  );
}

function HeroPanel() {
  return (
    <section className="relative hidden min-h-full overflow-hidden bg-[#20243a] lg:flex lg:w-[48%] lg:flex-col lg:justify-between lg:p-10 xl:p-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(136,125,255,0.62),transparent_30%),radial-gradient(circle_at_84%_70%,rgba(45,212,191,0.2),transparent_28%),linear-gradient(145deg,#1b2040_0%,#30345a_48%,#111527_100%)]" />
      <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full border border-white/10 bg-white/5 blur-sm" />
      <div className="absolute -right-24 top-12 h-96 w-96 rounded-full border border-indigo-100/10 bg-indigo-300/10 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(8,12,28,0.75))]" />

      <div className="relative flex items-center justify-between">
        <BrandMark light />
        <a href="#help" className="text-sm font-medium text-white/70 transition hover:text-white">Need help?</a>
      </div>

      <div className="relative max-w-xl pb-2 text-white">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">Scholarship operations platform</p>
        <h1 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Make every student opportunity count.</h1>
        <p className="mt-6 max-w-md text-base leading-7 text-indigo-100/75">A focused workspace for teams managing student records, enrollment, and scholarship access with confidence.</p>
        <div className="mt-9 flex items-center gap-2" aria-label="Hero carousel position"><span className="h-1.5 w-8 rounded-full bg-white" /><span className="h-1.5 w-1.5 rounded-full bg-white/35" /><span className="h-1.5 w-1.5 rounded-full bg-white/35" /></div>
      </div>
    </section>
  );
}

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

  return (
    <main className=" w-full bg-[#f4f5f9] p-3 text-slate-950">
      <div className="   flex  max-w-[1480px] overflow-hidden rounded-[24px] border border-white bg-white shadow-[0_24px_90px_rgba(15,23,42,0.12)]]">
        <HeroPanel />

        <section className="flex min-w-0 flex-1 flex-col bg-white px-6 py-7 sm:px-12 sm:py-10 lg:w-[52%] lg:px-16 xl:px-24">
          <div className="flex items-center justify-between lg:hidden"><BrandMark /><a href="#help" className="text-sm font-medium text-slate-500 hover:text-slate-900">Need help?</a></div>
          <div className="flex flex-1 items-center justify-center py-7 sm:py-10">
            <div className="w-full max-w-md">
              <div className="mb-7"><p className="text-sm font-semibold text-[#635BFF]">Welcome back</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Sign in to your workspace</h2><p className="mt-3 text-sm leading-6 text-slate-500">Continue to manage your scholar operations securely.</p></div>
              <div className="[&>div]:!w-full [&>div]:!max-w-none [&_input]:!rounded-xl [&_input]:!border-slate-200 [&_input]:!bg-slate-50 [&_input]:!px-4 [&_input]:!py-3 [&_button]:!rounded-xl [&_button]:!bg-[#635BFF] [&_button]:hover:!bg-[#5148e5]">
                <AuthPortal redirectTo={nextValue ?? "/dashboard"} />
              </div>
              <p className="mt-7 text-center text-xs leading-5 text-slate-400">By continuing, you agree to the Erda Scholar System access policy.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
