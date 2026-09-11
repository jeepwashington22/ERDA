"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { StudentFullRow } from "@/server/services/student-registry";

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 36;
const FALLBACK_VIEWPORT_HEIGHT = 560;
const OVERSCAN = 6;

// Fixed widths so the pinned columns line up across header and body.
const STUDENT_COL_WIDTH = 220;
const CODE_COL_WIDTH = 150;
const EDIT_COL_WIDTH = 90;
const DATA_COL_WIDTH = 170;
const CODE_COL_LEFT = STUDENT_COL_WIDTH; // 220
const EDIT_COL_LEFT = STUDENT_COL_WIDTH + CODE_COL_WIDTH; // 370

// Column order/labels match the SY intake spreadsheet exactly.
// Student name, child code and the edit action stay pinned on the left,
// so they are not repeated among the scrollable columns.
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

function CellValue({ value }: { value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === "") {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        None
      </span>
    );
  }
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  return <>{String(value)}</>;
}

const MemoCell = memo(CellValue);

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4Z" />
    </svg>
  );
}

export function StudentTable({ rows }: { rows: StudentFullRow[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [rows]);

  // Measure the real scroll viewport so the virtual window always covers the
  // visible area — a fixed estimate leaves blank rows on tall screens.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      setViewportHeight(height > 0 ? height : FALLBACK_VIEWPORT_HEIGHT);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const totalHeight = rows.length * ROW_HEIGHT;

  const { start, end } = useMemo(() => {
    const first = Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN;
    const visible = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const safeFirst = Math.max(0, first);
    return {
      start: safeFirst,
      end: Math.min(rows.length, safeFirst + visible),
    };
  }, [scrollTop, rows.length, viewportHeight]);

  const visibleRows = rows.slice(start, end);

  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-white text-sm text-slate-500">
        No student records match these filters.
      </div>
    );
  }

  // Pinned cells need an opaque background or horizontally scrolling
  // columns would show through them while they stay fixed.
  const pinnedBg = (odd: boolean) =>
    odd ? "bg-[#f7fefb] group-hover:bg-emerald-50" : "bg-white group-hover:bg-emerald-50";

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className="min-h-0 flex-1 overflow-auto bg-white"
    >
      <div style={{ width: "max-content", minWidth: "100%" }}>
        {/* Sticky header — pinned corner cells stay visible on both axes */}
        <div
          className="sticky top-0 z-20 flex bg-emerald-600 text-[11px] font-semibold uppercase tracking-wide text-emerald-50"
          style={{ height: HEADER_HEIGHT }}
        >
          <div
            className="sticky left-0 z-30 flex items-center bg-emerald-600 px-5"
            style={{ left: 0, width: STUDENT_COL_WIDTH, minWidth: STUDENT_COL_WIDTH }}
          >
            Student
          </div>
          <div
            className="sticky z-30 flex items-center bg-emerald-600 px-5"
            style={{ left: CODE_COL_LEFT, width: CODE_COL_WIDTH, minWidth: CODE_COL_WIDTH }}
          >
            Child Code
          </div>
          <div
            className="sticky z-30 flex items-center justify-center bg-emerald-600 px-5"
            style={{ left: EDIT_COL_LEFT, width: EDIT_COL_WIDTH, minWidth: EDIT_COL_WIDTH }}
          >
            Edit
          </div>
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className="flex items-center whitespace-nowrap border-r border-emerald-500/40 px-5"
              style={{ width: DATA_COL_WIDTH, minWidth: DATA_COL_WIDTH }}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Virtualized body — spacer keeps the scrollbar accurate without rendering every row */}
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${start * ROW_HEIGHT}px)` }}>
            {visibleRows.map((row, i) => {
              const odd = (start + i) % 2 === 1;
              const studentName =
                [row.firstName, row.middleInitial, row.surname].filter(Boolean).join(" ") || "Unnamed";
              return (
                <div
                  key={row.id}
                  className={`group flex ${odd ? "bg-emerald-50/40" : "bg-white"} transition hover:bg-emerald-50/70`}
                  style={{ height: ROW_HEIGHT, width: "max-content", minWidth: "100%" }}
                >
                  {/* Pinned: student name */}
                  <div
                    className={`sticky left-0 z-10 flex items-center gap-2.5 overflow-hidden px-5 ${pinnedBg(odd)}`}
                    style={{ left: 0, width: STUDENT_COL_WIDTH, minWidth: STUDENT_COL_WIDTH }}
                    title={studentName}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                      {row.firstName?.[0] ?? "S"}
                      {row.surname?.[0] ?? ""}
                    </div>
                    <div className="truncate text-[13px] font-semibold text-slate-900">{studentName}</div>
                  </div>

                  {/* Pinned: child code */}
                  <div
                    className={`sticky z-10 flex items-center overflow-hidden whitespace-nowrap px-5 text-[13px] font-medium text-slate-700 ${pinnedBg(odd)}`}
                    style={{ left: CODE_COL_LEFT, width: CODE_COL_WIDTH, minWidth: CODE_COL_WIDTH }}
                  >
                    {row.childCode}
                  </div>

                  {/* Pinned: edit action */}
                  <div
                    className={`sticky z-10 flex items-center justify-center ${pinnedBg(odd)}`}
                    style={{ left: EDIT_COL_LEFT, width: EDIT_COL_WIDTH, minWidth: EDIT_COL_WIDTH }}
                  >
                    <Link
                      href={`/students/${row.id}/edit`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-800"
                      aria-label={`Edit ${[row.firstName, row.surname].filter(Boolean).join(" ") || "student"}`}
                    >
                      <EditIcon />
                    </Link>
                  </div>

                  {COLUMNS.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center overflow-hidden whitespace-nowrap border-r border-slate-100 px-5 text-[13px] text-slate-600"
                      style={{ width: DATA_COL_WIDTH, minWidth: DATA_COL_WIDTH }}
                      title={String(row[col.key] ?? "")}
                    >
                      <MemoCell value={row[col.key]} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
