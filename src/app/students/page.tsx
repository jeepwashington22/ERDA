import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  getStudentFilterOptions,
  getStudentRegistryRows,
} from "@/server/services/student-registry";
import { StudentFilters } from "./StudentFilters";

export const metadata = {
  title: "Students | Erda Scholar System",
};

type Student = Awaited<ReturnType<typeof getStudentRegistryRows>>["students"][number];

// TODO: replace with your actual Google Form URL once it's set up.
const GOOGLE_FORM_URL = "https://forms.google.com/your-form-id-here";

function StatusBadge({ status }: { status: string | null | undefined }) {
  const value = status ?? "Unknown";
  const normalized = value.toLowerCase();
  const tone = normalized.includes("active")
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
    : normalized.includes("inactive") || normalized.includes("drop")
      ? "bg-slate-100 text-slate-600 ring-slate-500/20"
      : "bg-amber-50 text-amber-700 ring-amber-600/20";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

function ActionMenu({ student }: { student: Student }) {
  return (
    <details className="relative">
      <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
        <span aria-hidden="true">⋯</span>
        <span className="sr-only">Actions for {student.childCode}</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-36 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-lg">
        <button className="w-full rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-50">View profile</button>
        <button className="w-full rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-50">Enrollment history</button>
      </div>
    </details>
  );
}

function TableCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-8 py-4 align-middle text-sm text-slate-600 ${className}`}>{children}</td>;
}

type PageProps = {
  searchParams: Promise<{
    search?: string;
    grade?: string;
    year?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function StudentsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const search = params.search ?? "";
  const gradeLevel = params.grade ?? "";
  const schoolYear = params.year ?? "";
  const status = params.status ?? "";
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 25;

  const [{ students, totalCount, totalPages }, filterOptions] = await Promise.all([
    getStudentRegistryRows({ search, gradeLevel, schoolYear, status, page: currentPage, pageSize }),
    getStudentFilterOptions(),
  ]);

  const visibleStart = students.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(currentPage * pageSize, totalCount);

  // Preserves the current filters/search when changing page or clicking
  // through — builds "?search=x&grade=y&page=2" style links.
  function buildPageHref(targetPage: number) {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (gradeLevel) qs.set("grade", gradeLevel);
    if (schoolYear) qs.set("year", schoolYear);
    if (status) qs.set("status", status);
    qs.set("page", String(targetPage));
    return `/students?${qs.toString()}`;
  }

  return (
    <AppShell title="Students" description="Manage and review the student registry.">
      <div className="w-full h-full bg-white flex flex-col rounded-none">
        <div className="border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-slate-950">Student Directory</h2>
          <p className="text-sm text-slate-500">{totalCount} records</p>
        </div>

        {/* Filters + search update the URL live (debounced for the search
            box), handled client-side in StudentFilters. Each URL change
            re-runs this server component's data fetch automatically. */}
        <div className="border-b border-slate-100 px-8 py-5 shrink-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex-1">
              <StudentFilters
                gradeLevels={filterOptions.gradeLevels}
                schoolYears={filterOptions.schoolYears}
                statuses={filterOptions.statuses}
              />
            </div>

            {/* Add student -> redirects to the Google Form. No submit
                handler yet, just a plain link, per current scope. */}
            <a
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 flex items-center rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              Add student
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-[1350px] w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
              <tr className="border-b border-slate-200">
                <th className="px-8 py-4">Student</th>
                <th className="px-8 py-4">Reference</th>
                <th className="px-8 py-4">Location</th>
                <th className="px-8 py-4">Grade</th>
                <th className="px-8 py-4">School year</th>
                <th className="px-8 py-4">School</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr><td className="px-5 py-12 text-center text-sm text-slate-500" colSpan={8}>No student records match your filters.</td></tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="group transition hover:bg-slate-50/80">
                    <TableCell className="min-w-[240px]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{(student.firstName?.[0] ?? "S")}{(student.surname?.[0] ?? "")}</div>
                        <div><div className="text-sm font-semibold text-slate-900">{[student.firstName, student.middleInitial, student.surname].filter(Boolean).join(" ") || "Unnamed"}</div><div className="text-xs text-slate-500">{student.sex ?? "—"}</div></div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">{student.childCode}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs">{[student.barangay, student.city, student.province].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell>{student.gradeLevel ?? "—"}</TableCell>
                    <TableCell>{student.latestSchoolYear ?? "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs">{student.schoolName ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={student.educationStatus} /></TableCell>
                    <TableCell className="text-right"><div className="flex justify-end"><ActionMenu student={student} /></div></TableCell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-8 py-5 shrink-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm">
            <div>
              <span className="text-slate-600">Showing <strong className="text-slate-800">{visibleStart}–{visibleEnd}</strong> of <strong className="text-slate-800">{totalCount}</strong> entries</span>
            </div>
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <a href={buildPageHref(currentPage - 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 transition hover:bg-slate-50">Prev</a>
              ) : (
                <button className="rounded-lg border border-slate-200 px-4 py-2 text-slate-400" disabled>Prev</button>
              )}
              <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 font-semibold text-indigo-700">{currentPage} / {totalPages}</span>
              {currentPage < totalPages ? (
                <a href={buildPageHref(currentPage + 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-slate-500 transition hover:bg-slate-50">Next</a>
              ) : (
                <button className="rounded-lg border border-slate-200 px-4 py-2 text-slate-400" disabled>Next</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}