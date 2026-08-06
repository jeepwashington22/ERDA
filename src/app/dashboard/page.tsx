import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AppShell } from "@/components/app-shell";
import { getDashboardSummary } from "@/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard | Erda Scholar System",
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const summary = await getDashboardSummary(authData.user.id);

  return (
    <AppShell
      title="Dashboard"
      description={`${summary.currentUserProfile?.fullName ?? authData.user.email ?? "Unknown user"} is signed in as ${summary.currentUserProfile?.role ?? "unknown role"}.`}
    >
      {summary.databaseUnavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Dashboard database connection is not configured yet. Set SUPABASE_POOL_URL to enable live counts.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Students</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summary.totalStudents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Grade submissions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summary.totalGradeSubmissions}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Role</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summary.currentUserProfile?.role ?? "staff"}</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">Recent grade submissions</h3>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">School year</th>
                <th className="px-4 py-3 font-medium">Grade level</th>
                <th className="px-4 py-3 font-medium">General average</th>
                <th className="px-4 py-3 font-medium">Math grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {summary.recentSubmissions.map((submission) => (
                <tr key={submission.enrollmentRecordId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{submission.studentName}</div>
                    <div className="text-slate-500">{submission.childCode}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{submission.schoolYear}</td>
                  <td className="px-4 py-3 text-slate-700">{submission.gradeLevel ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-slate-700">{submission.generalAverage ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{submission.mathGrade1stPeriod ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}