import { createSupabaseServerClient } from "@/lib/supabase-server";
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
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold">Scholar system overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {summary.currentUserProfile?.fullName ?? authData.user.email ?? "Unknown user"} is signed in as {summary.currentUserProfile?.role ?? "unknown role"}.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Students</p>
              <p className="mt-1 text-3xl font-semibold">{summary.totalStudents}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Grade submissions</p>
              <p className="mt-1 text-3xl font-semibold">{summary.totalGradeSubmissions}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Role</p>
              <p className="mt-1 text-3xl font-semibold">{summary.currentUserProfile?.role ?? "staff"}</p>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">Recent grade submissions</h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
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
        </div>
      </div>
    </main>
  );
}