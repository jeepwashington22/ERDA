import { requireCurrentUser } from "@/lib/current-user";
import { getDashboardSummary } from "@/server";
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

function ChartViewport({ children, minWidth = "min-w-[600px]" }: ChartViewportProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-emerald-200">
      <div className={`${minWidth} h-[260px]`}>{children}</div>
    </div>
  );
}

// Single green family, just varying intensity for visual hierarchy -
// solid emerald-600 for the primary stat, softer emerald-50 tints for the rest.
type Weight = "solid" | "soft";

function StatIcon({ name, className }: { name: "users" | "file" | "map" | "badge"; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "users") {
    return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><circle {...common} cx="9" cy="8" r="3" /><path {...common} d="M3.8 19c.5-3 2.3-4.8 5.2-4.8s4.7 1.8 5.2 4.8" /><path {...common} d="M15 5.5a3 3 0 0 1 0 5.7M16.1 14.4c2.4.4 3.8 1.9 4.1 4.6" /></svg>;
  }
  if (name === "file") {
    return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path {...common} d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Z" /><path {...common} d="M14 3.5V8h4M9 12h6M9 16h6" /></svg>;
  }
  if (name === "map") {
    return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path {...common} d="M9 4.5 4 6.5v13l5-2 6 2 5-2v-13l-5 2-6-2Z" /><path {...common} d="M9 4.5v13M15 6.5v13" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path {...common} d="M12 3.5 4.5 7v6c0 4 3.2 6.8 7.5 8 4.3-1.2 7.5-4 7.5-8V7L12 3.5Z" /><path {...common} d="m9.3 12 1.8 1.8 3.6-3.6" /></svg>;
}

function roleText(role: string) {
  if (role === "super_admin") return "Super Admin";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ provinceId?: string; schoolYear?: string }>;
}) {
  // Auth + shell come from the shared (app) layout. While getDashboardSummary
  // runs, the segment loading.tsx shows a centered dashboard skeleton.
  const user = await requireCurrentUser();

  const { provinceId, schoolYear } = await searchParams;
  const summary = await getDashboardSummary(user.id, { provinceId, schoolYear });

  const statCard = (
    label: string,
    value: string | number,
    icon: "users" | "file" | "map" | "badge",
    weight: Weight,
  ) => {
    const solid = weight === "solid";
    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border p-5 transition-shadow duration-200 hover:shadow-md ${
          solid
            ? "border-emerald-600/60 bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm shadow-emerald-900/20"
            : "border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]"
        }`}
      >
        {solid ? (
          <div aria-hidden className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
        ) : null}
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${solid ? "text-emerald-50" : "text-slate-500"}`}>
              {label}
            </p>
            <p className={`mt-2 truncate text-3xl font-bold tracking-tight ${solid ? "text-white" : "text-slate-900"}`}>
              {value}
            </p>
          </div>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
              solid ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
            }`}
          >
            <StatIcon name={icon} className="h-5 w-5" />
          </span>
        </div>
      </div>
    );
  };

  const chartCard = (title: string, description: string, children: React.ReactNode, className = "") => (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs leading-4 text-slate-500">{description}</p>
        </div>
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100" aria-hidden="true" />
      </div>
      {children}
    </section>
  );

  return (
    <>
      {summary.databaseUnavailable ? (
        <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Dashboard database connection is not configured yet. Set SUPABASE_POOL_URL to enable live counts.
        </div>
      ) : (
        <div className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DashboardFilters
              provinceOptions={summary.provinceOptions}
              schoolYearOptions={summary.schoolYearOptions}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCard("Students", summary.totalStudents, "users", "solid")}
            {statCard("Grade submissions", summary.totalGradeSubmissions, "file", "soft")}
            {statCard("Provinces covered", summary.totalProvincesCovered, "map", "soft")}
            {statCard("Role", roleText(summary.currentUserProfile?.role ?? "staff"), "badge", "soft")}
          </div>

          <div className="grid items-stretch gap-5 xl:grid-cols-3">
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
              <div className="relative h-[260px]">
                <ProvinceShareChart data={summary.studentsByProvince} />
              </div>,
            )}
          </div>

          <div className="grid items-stretch gap-5 xl:grid-cols-3">
            {chartCard(
              "Enrollment trend by year",
              "Top 5 provinces, year over year",
              <ChartViewport minWidth="min-w-[660px]">
                <ProvinceYearTrendChart data={summary.provinceYearTrend} />
              </ChartViewport>,
              "xl:col-span-2",
            )}
            {chartCard(
              "Data completeness",
              "Provinces lagging on grade submissions",
              <div className="h-[240px] overflow-y-auto pr-1">
                <CoverageList data={summary.provinceCoverage} />
              </div>,
            )}
          </div>

          {chartCard(
            "Recent grade submissions",
            "Latest student performance records",
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-[680px] divide-y divide-slate-100 text-[13px]">
                <thead className="bg-slate-100/80 text-left text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-3.5 py-2.5 font-medium">Student</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5 font-medium">School year</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5 font-medium">Grade level</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5 font-medium">General average</th>
                    <th className="whitespace-nowrap px-3.5 py-2.5 font-medium">Math grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {summary.recentSubmissions.map((s) => (
                    <tr key={s.enrollmentRecordId} className="transition-colors hover:bg-emerald-50/40">
                      <td className="px-3.5 py-2.5">
                        <div className="font-medium text-slate-900">{s.studentName}</div>
                        <div className="text-[11px] text-slate-500">{s.childCode}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700">{s.schoolYear}</td>
                      <td className="px-3.5 py-2.5 text-slate-700">{s.gradeLevel ?? "Unknown"}</td>
                      <td className="px-3.5 py-2.5 text-slate-700">{s.generalAverage ?? "-"}</td>
                      <td className="px-3.5 py-2.5 text-slate-700">{s.mathGrade1stPeriod ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          )}
        </div>
      )}
    </>
  );
}
