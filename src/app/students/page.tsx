import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { queryPostgres } from "@/server/lib/postgres";
import {
  getStudentRegistryRows,
  getStudentFilterOptions,
  type StudentFullRow,
} from "@/server/services/student-registry";
import { StudentFilters } from "./StudentFilters";
import { ExportStudentsButton } from "./ExportStudent";

export const metadata = { title: "Students | Erda Scholar System" };

function fmt(v: string | number | boolean | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function NoneBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      None
    </span>
  );
}

function Cell({ value }: { value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === "") {
    return <NoneBadge />;
  }
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  return <>{String(value)}</>;
}

// Column order/labels match the SY intake spreadsheet exactly.
const COLUMNS: { label: string; key: keyof StudentFullRow }[] = [
  { label: "No.", key: "intakeNo" },
  { label: "Date of Intake Interview", key: "dateOfIntakeInterview" },
  { label: "Batch Number", key: "batchNumber" },
  { label: "Province", key: "province" },
  { label: "City/ Municipality", key: "city" },
  { label: "Barangay", key: "barangay" },
  { label: "Sitio/ Phase", key: "sitioPhase" },
  { label: "Complete Address", key: "completeAddress" },
  { label: "Middle Initial", key: "middleInitial" },
  { label: "Sex/ Gender", key: "sex" },
  { label: "Date of Birth", key: "dateOfBirth" },
  { label: "Age", key: "age" },
  { label: "Grade/ Year Level", key: "gradeLevel" },
  { label: "Track for Senior High", key: "shsTrack" },
  { label: "Course in College", key: "courseInCollege" },
  { label: "Name of School", key: "schoolName" },
  { label: "Classification upon Admission", key: "classification" },
  { label: "Reason for dropping out", key: "dropoutReason" },
  { label: "Reason for dropping out: Others", key: "dropoutReasonOther" },
  { label: "CNSP Cluster", key: "cnspCluster" },
  { label: "Education Status", key: "educationStatus" },
  { label: "HH Head: Surname", key: "hhHeadSurname" },
  { label: "HH Head: First Name", key: "hhHeadFirstName" },
  { label: "HH Head: Surname (Mother)", key: "hhHeadSurnameMother" },
  { label: "HH Head: First Name (Mother)", key: "hhHeadFirstNameMother" },
  { label: "Occupation of HH Head", key: "occupationOfHhHead" },
  { label: "Family Per Capita Income", key: "familyPerCapitaIncome" },
  { label: "HC: House Ownership", key: "houseOwnership" },
  { label: "House Ownership: Others", key: "houseOwnershipOther" },
  { label: "Size of Dwelling", key: "sizeOfDwelling" },
  { label: "Materials", key: "materials" },
  { label: "Materials: Others", key: "materialsOther" },
  { label: "Water Supply", key: "waterSupply" },
  { label: "Water Supply: Others", key: "waterSupplyOther" },
  { label: "Lighting Facilities", key: "lightingFacility" },
  { label: "Lighting Facilities: Others", key: "lightingFacilityOther" },
  { label: "Toilet Facility", key: "toiletFacility" },
  { label: "Toilet Facility: Others", key: "toiletFacilityOther" },
  { label: "Furniture/s", key: "furnitures" },
  { label: "Served by welfare agency", key: "presentlyServedByWelfareAgency" },
  { label: "Name of Welfare Agency", key: "welfareAgencyName" },
  { label: "Type of service Availed", key: "typeOfServiceAvailed" },
  { label: "Org. membership", key: "isOrganizationMember" },
  { label: "Type of Organization", key: "organizationType" },
  { label: "Social Protection Program", key: "socialProtectionProgram" },
  { label: "Social Protection: Others", key: "socialProtectionOther" },
  { label: "Type of Scheme/ Implementation", key: "educationScheme" },
  { label: "Name of Tie-up Partner", key: "tieUpPartnerName" },
  { label: "Staff In-Charge", key: "staffInCharge" },
  { label: "Name of Funder", key: "funderName" },
  { label: "Location for Reporting", key: "locationForReporting" },
  { label: "Remarks", key: "remarks" },
];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; grade?: string; year?: string; status?: string; page?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  let profile: { full_name: string | null; role: string } | null = null;
  try {
    const profileRows = await queryPostgres<{ full_name: string | null; role: string }>(
      "select full_name, role from user_profiles where id = $1 limit 1",
      [data.user.id],
    );
    profile = profileRows[0] ?? null;
  } catch {
    profile = null;
  }

  const params = await searchParams;
  const filters = { search: params.search, grade: params.grade, year: params.year, status: params.status };
  const pageSize = 25;
  const currentPage = Math.max(1, Number(params.page) || 1);

  const [{ rows: students, totalCount }, filterOptions] = await Promise.all([
    getStudentRegistryRows(filters, currentPage, pageSize),
    getStudentFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const visibleStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(currentPage * pageSize, totalCount);

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
    <AppShell
      title="Students"
      description="Manage and review the student registry."
      userRole={profile?.role}
      userName={profile?.full_name ?? undefined}
      userEmail={data.user.email}
    >
      <div className="w-full h-full bg-slate-100 flex flex-col gap-4 p-4">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-white px-5 py-3 flex items-center justify-between shrink-0">
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

        <div className="border-b border-emerald-100 bg-white px-5 py-2.5 shrink-0">
          <StudentFilters
            gradeLevels={filterOptions.gradeLevels}
            schoolYears={filterOptions.schoolYears}
            statuses={filterOptions.statuses}
          />
        </div>
        

        <div className="flex-1 overflow-auto bg-white">
          <table
            className="w-full border-collapse text-left text-xs"
            style={{ minWidth: 200 + 90 + COLUMNS.length * 130 }}
          >
            <thead className="sticky top-0 z-20 bg-emerald-600 text-[11px] font-semibold uppercase tracking-wide text-emerald-50">
              <tr>
                <th className="sticky left-0 z-30 bg-emerald-600 px-4 py-2.5 min-w-[200px]">Student</th>
                <th className="sticky left-[200px] z-30 bg-emerald-600 px-4 py-2.5 min-w-[130px]">Child Code</th>
                <th className="sticky left-[330px] z-30 bg-emerald-600 px-4 py-2.5 min-w-[90px] text-center">Edit</th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-2.5 min-w-[130px] whitespace-nowrap">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/70">
              {students.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={COLUMNS.length + 3}>
                    No student records match these filters.
                  </td>
                </tr>
              ) : (
                students.map((s, i) => {
                  const rowBg = i % 2 === 0 ? "bg-white" : "bg-emerald-50/40";
                  return (
                    <tr key={s.id} className={`group transition hover:bg-emerald-50/70 ${rowBg}`}>
                      <td className={`sticky left-0 z-10 ${rowBg} px-4 py-2 min-w-[200px] group-hover:bg-emerald-50/70`}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                            {(s.firstName?.[0] ?? "S")}{(s.surname?.[0] ?? "")}
                          </div>
                          <div className="text-[13px] font-semibold text-slate-900">
                            {[s.firstName, s.middleInitial, s.surname].filter(Boolean).join(" ") || "Unnamed"}
                          </div>
                        </div>
                      </td>
                      <td className={`sticky left-[200px] z-10 ${rowBg} px-4 py-2 min-w-[130px] font-medium text-slate-700 group-hover:bg-emerald-50/70`}>
                        {s.childCode}
                      </td>
                      <td className={`sticky left-[330px] z-10 ${rowBg} px-4 py-2 min-w-[90px] text-center group-hover:bg-emerald-50/70`}>
                        <Link
                          href={`/students/${s.id}/edit`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-800"
                          aria-label={`Edit ${[s.firstName, s.surname].filter(Boolean).join(" ") || "student"}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4Z" />
                          </svg>
                        </Link>
                      </td>
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="px-4 py-2 min-w-[130px] whitespace-nowrap text-slate-600">
                          <Cell value={s[col.key] as any} />
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-emerald-100 bg-white px-5 py-2.5 shrink-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            <span className="text-slate-600">
              Showing <strong className="text-slate-800">{visibleStart}–{visibleEnd}</strong> of{" "}
              <strong className="text-slate-800">{totalCount}</strong> entries
            </span>
            <div className="flex items-center gap-1.5">
              {currentPage > 1 ? (
                <Link href={pageHref(currentPage - 1)} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-slate-600 hover:bg-emerald-50">Prev</Link>
              ) : (
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400" disabled>Prev</button>
              )}
              <span className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white">{currentPage} of {totalPages}</span>
              {currentPage < totalPages ? (
                <Link href={pageHref(currentPage + 1)} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-slate-600 hover:bg-emerald-50">Next</Link>
              ) : (
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400" disabled>Next</button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  );
} 