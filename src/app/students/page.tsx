import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, role")
    .eq("id", data.user.id)
    .single();

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
      <div className="w-full h-full bg-white flex flex-col rounded-none">
        <div className="border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0">
  <h2 className="text-base font-semibold text-slate-950">Student Directory</h2>
  <div className="flex items-center gap-4">
    <p className="text-sm text-slate-500">{totalCount} records</p>
    <ExportStudentsButton
      gradeLevels={filterOptions.gradeLevels}
      schoolYears={filterOptions.schoolYears}
      statuses={filterOptions.statuses}
    />
  </div>
</div>

        <div className="border-b border-slate-100 px-8 py-5 shrink-0">
          <StudentFilters
            gradeLevels={filterOptions.gradeLevels}
            schoolYears={filterOptions.schoolYears}
            statuses={filterOptions.statuses}
          />
        </div>
        

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: 260 + COLUMNS.length * 170 }}>
            <thead className="sticky top-0 z-20 bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
              <tr className="border-b border-slate-200">
                <th className="sticky left-0 z-30 bg-slate-50/95 px-6 py-4 min-w-[260px]">Student</th>
                <th className="sticky left-[260px] z-30 bg-slate-50/95 px-6 py-4 min-w-[160px]">Child Code</th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-6 py-4 min-w-[170px]">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-500" colSpan={COLUMNS.length + 2}>
                    No student records match these filters.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="group transition hover:bg-slate-50/80">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 px-6 py-4 min-w-[260px]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                          {(s.firstName?.[0] ?? "S")}{(s.surname?.[0] ?? "")}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {[s.firstName, s.middleInitial, s.surname].filter(Boolean).join(" ") || "Unnamed"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="sticky left-[260px] z-10 bg-white group-hover:bg-slate-50/80 px-6 py-4 min-w-[160px] font-medium text-slate-700">
                      {s.childCode}
                    </td>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="px-6 py-4 min-w-[170px] whitespace-nowrap text-sm text-slate-600">
                        {fmt(s[col.key] as any)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-8 py-5 shrink-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm">
            <span className="text-slate-600">
              Showing <strong className="text-slate-800">{visibleStart}–{visibleEnd}</strong> of{" "}
              <strong className="text-slate-800">{totalCount}</strong> entries
            </span>
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link href={pageHref(currentPage - 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50">Prev</Link>
              ) : (
                <button className="rounded-lg border border-slate-200 px-4 py-2 text-slate-400" disabled>Prev</button>
              )}
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700">{currentPage} of {totalPages}</span>
              {currentPage < totalPages ? (
                <Link href={pageHref(currentPage + 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50">Next</Link>
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