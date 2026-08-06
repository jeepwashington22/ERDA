import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata = {
  title: "Accounts | Erda Scholar System",
};

export default async function AccountsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return (
    <AppShell
      title="Account management"
      description="Create and manage user accounts for staff, admins, and super admins from one protected workspace."
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Create account</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">New user</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This panel is ready for the server action that calls Supabase Auth admin createUser and then lets the database trigger build the profile row.
          </p>

          <form className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Email
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none placeholder:text-slate-400" placeholder="name@school.edu" type="email" />
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Full name
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none placeholder:text-slate-400" placeholder="Given family name" type="text" />
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Role
              <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none">
                <option>staff</option>
                <option>admin</option>
                <option>super_admin</option>
              </select>
            </label>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white opacity-60"
            >
              Create account
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Existing users</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Role overview</h3>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                <tr>
                  <td className="px-4 py-4 text-slate-700" colSpan={4}>
                    Wire this view to user_profiles next so admins can review and update roles live.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}