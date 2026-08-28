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

function ChartViewport({ children, minWidth = "min-w-[600px]" }: ChartViewportProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/40">
      <div className={`${minWidth} h-[200px]`}>{children}</div>
    </div>
  );
}

type Accent = "emerald" | "sky" | "violet" | "amber";

// Solid tinted card backgrounds, like the reference — not just accent lines.
const ACCENTS: Record<Accent, { card: string; iconBg: string; iconText: string; text: string; subtext: string }> = {
  sky: { card: "bg-sky-600", iconBg: "bg-white/20", iconText: "text-white", text: "text-white", subtext: "text-sky-100" },
  violet: { card: "bg-violet-600", iconBg: "bg-white/20", iconText: "text-white", text: "text-white", subtext: "text-violet-100" },
  amber: { card: "bg-amber-500", iconBg: "bg-white/20", iconText: "text-white", text: "text-white", subtext: "text-amber-50" },
  emerald: { card: "bg-emerald-600", iconBg: "bg-white/20", iconText: "text-white", text: "text-white", subtext: "text-emerald-100" },
};

// Soft tints for chart cards — full-strength color would fight with the charts drawn inside them.
const CHART_ACCENTS: Record<Accent, { card: string; border: string; title: string; desc: string; dot: string }> = {
  sky: { card: "bg-sky-50/60", border: "border-sky-100", title: "text-sky-900", desc: "text-sky-600/70", dot: "bg-sky-500" },
  violet: { card: "bg-violet-50/60", border: "border-violet-100", title: "text-violet-900", desc: "text-violet-600/70", dot: "bg-violet-500" },
  amber: { card: "bg-amber-50/60", border: "border-amber-100", title: "text-amber-900", desc: "text-amber-700/70", dot: "bg-amber-500" },
  emerald: { card: "bg-emerald-50/60", border: "border-emerald-100", title: "text-emerald-900", desc: "text-emerald-700/70", dot: "bg-emerald-500" },
};

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

  const statCard = (
    label: string,
    value: string | number,
    icon: "users" | "file" | "map" | "badge",
    accent: Accent,
  ) => {
    const a = ACCENTS[accent];
    return (
      <div className={`flex min-h-[92px] flex-col justify-between rounded-xl ${a.card} px-4 py-3.5 shadow-md shadow-black/[0.06]`}>
        <div className="flex items-center justify-between">
          <p className={`text-[11px] font-medium uppercase tracking-[0.06em] ${a.subtext}`}>{label}</p>
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.iconBg} ${a.iconText}`}>
            <StatIcon name={icon} className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className={`mt-1 text-xl font-semibold tracking-tight ${a.text} sm:text-2xl`}>{value}</p>
      </div>
    );
  };

  const chartCard = (
    title: string,
    description: string,
    children: React.ReactNode,
    accent: Accent,
    className = "",
  ) => {
    const a = CHART_ACCENTS[accent];
    return (
      <section className={`rounded-xl border ${a.border} ${a.card} p-4 shadow-sm shadow-emerald-950/[0.03] sm:p-5 ${className}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-h-[34px]">
            <h3 className={`text-[13px] font-semibold ${a.title}`}>{title}</h3>
            <p className={`mt-0.5 text-[11px] leading-4 ${a.desc}`}>{description}</p>
          </div>
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.dot}`} aria-hidden="true" />
        </div>
        {children}
      </section>
    );
  };

  return (
    <AppShell
      title="Dashboard"
      description={`${summary.currentUserProfile?.fullName ?? authData.user.email ?? "Unknown user"} is signed in as ${summary.currentUserProfile?.role ?? "unknown role"}.`}
      userRole={summary.currentUserProfile?.role}
      userName={summary.currentUserProfile?.fullName ?? undefined}
      userEmail={authData.user.email}
    >
      {summary.databaseUnavailable ? (
        <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Dashboard database connection is not configured yet. Set SUPABASE_POOL_URL to enable live counts.
        </div>
      ) : (
        <div className="space-y-5 p-4 sm:p-6">
          <DashboardFilters
            provinceOptions={summary.provinceOptions}
            schoolYearOptions={summary.schoolYearOptions}
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCard("Students", summary.totalStudents, "users", "sky")}
            {statCard("Grade submissions", summary.totalGradeSubmissions, "file", "violet")}
            {statCard("Provinces covered", summary.totalProvincesCovered, "map", "amber")}
            {statCard("Role", summary.currentUserProfile?.role ?? "staff", "badge", "emerald")}
          </div>

          <div className="grid items-stretch gap-5 xl:grid-cols-3">
            {chartCard(
              "Students by province",
              "Top provinces by enrolled student count",
              <ChartViewport>
                <StudentsByProvinceChart data={summary.studentsByProvince} />
              </ChartViewport>,
              "sky",
              "xl:col-span-2",
            )}
            {chartCard(
              "Province share",
              "% of total student population",
              <div className="flex h-[200px] items-center justify-center">
                <ProvinceShareChart data={summary.studentsByProvince} />
              </div>,
              "violet",
            )}
          </div>

          <div className="grid items-stretch gap-5 xl:grid-cols-3">
            {chartCard(
              "Enrollment trend by year",
              "Top 5 provinces, year over year",
              <ChartViewport minWidth="min-w-[660px]">
                <ProvinceYearTrendChart data={summary.provinceYearTrend} />
              </ChartViewport>,
              "emerald",
              "xl:col-span-2",
            )}
            {chartCard(
              "Data completeness",
              "Provinces lagging on grade submissions",
              <div className="h-[200px] overflow-y-auto pr-1">
                <CoverageList data={summary.provinceCoverage} />
              </div>,
              "amber",
            )}
          </div>

          {chartCard(
            "Recent grade submissions",
            "Latest student performance records",
            <div className="overflow-x-auto rounded-lg border border-white bg-white">
              <table className="min-w-[680px] divide-y divide-slate-100 text-[13px]">
                <thead className="bg-slate-50/80 text-left text-slate-500">
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
                    <tr key={s.enrollmentRecordId} className="transition-colors hover:bg-sky-50/40">
                      <td className="px-3.5 py-2.5">
                        <div className="font-medium text-slate-900">{s.studentName}</div>
                        <div className="text-[11px] text-slate-500">{s.childCode}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700">{s.schoolYear}</td>
                      <td className="px-3.5 py-2.5 text-slate-700">{s.gradeLevel ?? "Unknown"}</td>
                      <td className="px-3.5 py-2.5 text-slate-700">{s.generalAverage ?? "—"}</td>
                      <td className="px-3.5 py-2.5 text-slate-700">{s.mathGrade1stPeriod ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
            "sky",
          )}
        </div>
      )}
    </AppShell>
  );
}