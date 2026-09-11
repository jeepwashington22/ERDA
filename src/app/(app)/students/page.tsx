import Link from "next/link";

import {
  getStudentRegistryRows,
  getStudentFilterOptions,
} from "@/server/services/student-registry";
import { StudentFilters } from "./StudentFilters";
import { ExportStudentsButton } from "./ExportStudent";
import { StudentTable } from "./StudentTable";

export const metadata = { title: "Students | Erda Scholar System" };

const PAGE_SIZE = 25;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; grade?: string; year?: string; status?: string; page?: string }>;
}) {
  // Auth + profile (name, role) are resolved once per request in the shared
  // (app) layout. While this page fetches, the segment loading.tsx renders a
  // centered loading state inside the persistent shell.
  const params = await searchParams;
  const filters = { search: params.search, grade: params.grade, year: params.year, status: params.status };
  const currentPage = Math.max(1, Number(params.page) || 1);

  const [{ rows: students, totalCount }, filterOptions] = await Promise.all([
    getStudentRegistryRows(filters, currentPage, PAGE_SIZE),
    getStudentFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const visibleStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  function pageHref(targetPage: number) {
    const p = new URLSearchParams();
    if (params.search) p.set("search", params.search);
    if (params.grade) p.set("grade", params.grade);
    if (params.year) p.set("year", params.year);
    if (params.status) p.set("status", params.status);
    p.set("page", String(targetPage));
    return `/students?${p.toString()}`;
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-slate-100 p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Directory header */}
        <div className="flex shrink-0 items-center justify-between border-b border-emerald-100 bg-white px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-950">Student Directory</h2>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">{totalCount} records</p>
            <ExportStudentsButton
              gradeLevels={filterOptions.gradeLevels}
              schoolYears={filterOptions.schoolYears}
              statuses={filterOptions.statuses}
            />
          </div>
        </div>

        {/* Filters strip */}
        <div className="shrink-0 border-b border-emerald-100 bg-white px-5 py-2.5">
          <StudentFilters
            gradeLevels={filterOptions.gradeLevels}
            schoolYears={filterOptions.schoolYears}
            statuses={filterOptions.statuses}
          />
        </div>

        {/* Table (virtualized - only visible rows render) */}
        <StudentTable rows={students} />

        {/* Footer pagination */}
        <div className="shrink-0 border-t border-emerald-100 bg-white px-5 py-2.5">
          <div className="flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span className="text-slate-600">
              Showing <strong className="text-slate-800">{visibleStart}-{visibleEnd}</strong> of{" "}
              <strong className="text-slate-800">{totalCount}</strong> entries
            </span>
            <div className="flex items-center gap-1.5">
              {currentPage > 1 ? (
                <Link
                  href={pageHref(currentPage - 1)}
                  className="rounded-lg border border-emerald-200 px-3 py-1.5 text-slate-600 hover:bg-emerald-50"
                >
                  Prev
                </Link>
              ) : (
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400" disabled>
                  Prev
                </button>
              )}
              <span className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white">
                {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link
                  href={pageHref(currentPage + 1)}
                  className="rounded-lg border border-emerald-200 px-3 py-1.5 text-slate-600 hover:bg-emerald-50"
                >
                  Next
                </Link>
              ) : (
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400" disabled>
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
