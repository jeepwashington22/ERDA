import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AppShell } from "@/components/app-shell";
import { getDashboardSummary } from "@/server";
import { redirect } from "next/navigation";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import {
  StudentsByProvinceChart,
  ProvinceShareChart,
  ProvinceYearTrendChart,
  CoverageList,
} from "@/components/dashboard/dashboard-charts";

export const metadata = { title: "Dashboard | Erda Scholar System" };

type ChartViewportProps = {
  children: React.ReactNode;
  minWidth?: string;
};

function ChartViewport({ children, minWidth = "min-w-[680px]" }: ChartViewportProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-emerald-200">
      <div className={`${minWidth} h-[238px]`}>{children}</div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ provinceId?: string; schoolYear?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { provinceId, schoolYear } = await searchParams;
  const summary = await getDashboardSummary(authData.user.id, { provinceId, schoolYear });

  const statCard = (label: string, value: string | number) => (
    <div className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-sm shadow-emerald-950/[0.03]">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
    </div>
  );

  const chartCard = (title: string, description: string, children: React.ReactNode, className = "") => (
    <section className={`rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/[0.03] sm:p-6 ${className}`}>
      <div className="mb-4 flex min-h-[42px] flex-col justify-center">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  );

  return (
    <AppShell
      title="Dashboard"
      description={`${summary.currentUserProfile?.fullName ?? authData.user.email ?? "Unknown user"} is signed in as ${summary.currentUserProfile?.role ?? "unknown role"}.`}
    >
      {summary.databaseUnavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Dashboard database connection is not configured yet. Set SUPABASE_POOL_URL to enable live counts.
        </div>
      ) : (
        <div className="space-y-6">
          <DashboardFilters
            provinceOptions={summary.provinceOptions}
            schoolYearOptions={summary.schoolYearOptions}
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCard("Students", summary.totalStudents)}
            {statCard("Grade submissions", summary.totalGradeSubmissions)}
            {statCard("Provinces covered", summary.totalProvincesCovered)}
            {statCard("Role", summary.currentUserProfile?.role ?? "staff")}
          </div>

          <div className="grid items-stretch gap-6 xl:grid-cols-3">
            {chartCard(
              "Students by province",
              "Top provinces by enrolled student count",
              <ChartViewport>
                <StudentsByProvinceChart data={summary.studentsByProvince} />
              </ChartViewport>,
              "xl:col-span-2",
            )}
            {chartCard(
              "Province share",
              "% of total student population",
              <div className="flex h-[238px] items-center justify-center">
                <ProvinceShareChart data={summary.studentsByProvince} />
              </div>,
            )}
          </div>

          <div className="grid items-stretch gap-6 xl:grid-cols-3">
            {chartCard(
              "Enrollment trend by year",
              "Top 5 provinces, year over year",
              <ChartViewport minWidth="min-w-[760px]">
                <ProvinceYearTrendChart data={summary.provinceYearTrend} />
              </ChartViewport>,
              "xl:col-span-2",
            )}
            {chartCard(
              "Data completeness",
              "Provinces lagging on grade submissions",
              <div className="h-[238px] overflow-y-auto pr-1">
                <CoverageList data={summary.provinceCoverage} />
              </div>,
            )}
          </div>

          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-950/[0.03] sm:p-6">
            <div className="mb-4 flex min-h-[42px] flex-col justify-center">
              <h3 className="text-sm font-semibold text-slate-900">Recent grade submissions</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">Latest student performance records</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-emerald-100">
              <table className="min-w-[720px] divide-y divide-emerald-100 text-sm">
                <thead className="bg-emerald-50/60 text-left text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">Student</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">School year</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">Grade level</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">General average</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">Math grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 bg-white">
                  {summary.recentSubmissions.map((s) => (
                    <tr key={s.enrollmentRecordId} className="transition-colors hover:bg-emerald-50/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{s.studentName}</div>
                        <div className="text-slate-500">{s.childCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{s.schoolYear}</td>
                      <td className="px-4 py-3 text-slate-700">{s.gradeLevel ?? "Unknown"}</td>
                      <td className="px-4 py-3 text-slate-700">{s.generalAverage ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{s.mathGrade1stPeriod ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
