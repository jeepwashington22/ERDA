// ============================================================================
// scripts/migrate-yearly-records.ts
//
// ERDA SCHOLAR SYSTEM — Historical Excel → Supabase ETL (TypeScript)
//
// PURPOSE
// ----------------------------------------------------------------------------
// Migrates every yearly intake workbook (SY 2017-18 … SY 2025-26) from
// ./YearlyRecords into the normalized Supabase schema WITHOUT losing records
// and WITHOUT duplicating data that a previous (Python) migration already
// imported. Everything is an UPSERT, so the script is fully idempotent —
// you can re-run it as many times as needed.
//
// RELATIONAL ARCHITECTURE (see src/sql/erda_scholar_schema.sql)
// ----------------------------------------------------------------------------
//   students (1 permanent row per child, keyed by child_code)
//     └── enrollment_records (1 row per student PER school_year,
//           unique (student_id, school_year))
//           ├── household_snapshots   (unique enrollment_record_id)
//           ├── housing_conditions    (unique enrollment_record_id)
//           ├── welfare_services      (unique enrollment_record_id)
//           ├── academic_performance  (unique enrollment_record_id)
//           └── assistance_records    (1-to-many per enrollment)
//
// DATA FLOW PER EXCEL ROW
// ----------------------------------------------------------------------------
//   1. Parse raw row via fuzzy header matching (asterisks / spacing variants).
//   2. Upsert lookup values (cached in Maps → zero N+1 queries).
//   3. Upsert `students` on conflict (child_code) → returns student UUID.
//   4. Upsert `enrollment_records` on conflict (student_id, school_year)
//      → returns enrollment UUID.  If THIS fails, dependents are skipped.
//   5. Upsert household / housing / welfare / academic on the enrollment UUID,
//      and insert assistance_records (delete-then-insert for idempotency).
//
// RUN
// ----------------------------------------------------------------------------
//   npx tsx scripts/migrate-yearly-records.ts            # full run
//   npx tsx scripts/migrate-yearly-records.ts --dry-run  # parse only, no writes
//
// REQUIRED ENV (.env.local)
// ----------------------------------------------------------------------------
//   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (server-only! bypasses RLS for upserts)
// ============================================================================

import "dotenv/config";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

// ----------------------------------------------------------------------------
// 0. CONFIGURATION
// ----------------------------------------------------------------------------

const YEARLY_DIR = join(process.cwd(), "YearlyRecords");

function loadEnvFile(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const file of [".env.local", ".env"]) {
    const path = join(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      let value = rest.join("=").trim();
      if (value.length >= 2 && (value.startsWith('"') || value.startsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[key.trim()] = value;
    }
  }
  return values;
}

const envFile = loadEnvFile();
const env = (key: string): string | undefined => process.env[key] ?? envFile[key];

const SUPABASE_URL = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

const DRY_RUN = process.argv.includes("--dry-run");

if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local, or use --dry-run.",
  );
  process.exit(1);
}

/** Service-role client: bypasses RLS. NEVER expose this key to the browser. */
const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? "http://dry-run.invalid",
  SUPABASE_SERVICE_ROLE_KEY ?? "dry-run",
  { auth: { persistSession: false } },
);

// ----------------------------------------------------------------------------
// 1. HEADER NORMALIZATION (port of yearly_header_utils.py)
// ----------------------------------------------------------------------------

/**
 * Normalizes an Excel header so that variants like "*Child's Surname",
 * "Child's  Surname", "child's surname" all collapse to the same key.
 * Strips leading asterisks, non-breaking spaces, punctuation, and "&".
 */
function normalizeHeader(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value).replace(/\xa0/g, " ").trim().toLowerCase();
  text = text.replace(/^\*\s*/, ""); // leading asterisk (required-field marker)
  text = text.replace(/&/g, " and ");
  text = text.replace(/[()[\]{},.;:/\\-]+/g, " "); // punctuation → space
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Canonical field → every raw header variant seen across SY2017-18 … SY2025-26.
 * Mirrors HEADER_GROUPS in yearly_header_utils.py.
 */
const HEADER_GROUPS: Record<string, string[]> = {
  intakeNo: ["No.", "No. "],
  dateOfIntake: ["Date of Intake Interview"],
  childCode: ["Child Code"],
  batchNumber: ["Batch Number"],
  province: ["Province"],
  city: ["City/ Municipality", "edited_City/ Municipality", "Municipality/ City"],
  barangay: ["*Barangay", "Barangay"],
  sitioPhase: ["*Sitio/ Phase", "*Sitio Phase", "Sitio/ Phase", "Sitio Phase"],
  completeAddress: ["*Complete Address", "Complete Address"],
  surname: ["*Child's Surname", "Child's Surname"],
  firstName: ["*Child's First Name", "Child's First Name"],
  middleInitial: ["*Middle Initial", "Middle Initial"],
  sex: ["* Sex/ Gender", "Sex/ Gender", "Sex"],
  dateOfBirth: ["*Date of Birth", "Date of Birth"],
  income: ["*Family Per Capita Income", "Family Per Capita Income", "pci below 800"],
  gradeLevel: [
    "*Grade/ Year Level",
    "*Grade/ Year Level SY2020-21",
    "Grade/ Year Level",
    "Grade/ Year Level SY2020-21",
  ],
  schoolName: ["*Name of School", "Name of School"],
  classification: ["*Child's Classification upon Admission", "Child's Classification upon Admission"],
  cnsp: [
    "Children in Need of Special Protection ( CNSP Cluster)",
    "Children in Need of Special Protection (CNSP Cluster)",
  ],
  courseInCollege: ["Course in College", "Course (for College Students)"],
  shsTrack: ["Track for Senior High", "Track/Strand (for Senior High Students)"],
  welfareAgency: ["Name of  Welfare Agency", "Name of Welfare Agency"],
  typeOfService: [
    "Type of type service Availed",
    "Type of service Availed",
    "Type of service availed",
  ],
  presentlyServed: ["Presently served by welfare agency"],
  orgType: ["Type of Organization"],
  educationScheme: ["Type of Scheme/ Implementation ", "Type of Scheme/ Implementation"],
  socialProtection: [
    "Social Protection  Program Affiliation ",
    "Social Protection Program Affiliation",
    "Social Protection: Others",
  ],
  tieUpPartner: ["Name of Tie-up Partner"],
  staffInCharge: ["Staff In- Charge", "Staff In-Charge"],
  funder: ["Name of Funder     [for Finance Section]", "Name of Funder"],
  hhOccupation: ["Occupation of HH Head"],
  hhFirstName: [
    "HH Head: First Name",
    "HH Head: First Name ( Mother)",
    "HH Head: First Name (Mother)",
    "HH Head: First Name(father)",
    "HH Head: First Name(mother)",
  ],
  hhSurname: [
    "HH Head: Surname",
    "HH Head: Surname ( Mother)",
    "HH Head: Surname (Mother)",
    "HH Head: Surname(father)",
    "HH Head: Surname(mother)",
  ],
  hhMi: ["HH Head: MI"],
  houseOwnership: [
    "HC: House Ownership",
    "HC: House Ownership: If others, specify",
    "HC: House Ownership: Others",
  ],
  dwellingSize: ["Size of Dwelling"],
  materials: ["Materials", "Materials: Others", "Materials:Others", "Materials: If others, specify"],
  waterSupply: ["Water Supply", "Water Supply: Others", "Water Supply: If others, specify"],
  lighting: [
    "Lighting Facilities",
    "Lighting Facilities: Others",
    "Lighting Facilities: If others, specify",
  ],
  toilet: ["Toilet Facility", "Toilet Facility: Others", "Toilet Facility: If others, specify"],
  furnitures: ["Furniture/s"],
  educationStatus: ["Education Status", "Child's Education  Status  (as ERDA Beneficiary)"],
  reasonInactive: ["Reason for being Inactive", "Others Please Specify/Reason/s why child lost interest"],
  graduateRemarks: ["Graduate_Remarks"],
  droppedOut4Months: ["Did the child drop out from school for the past four months"],
  dropoutReason: [
    "Reason for dropping out",
    "Reason for dropping out: Others",
    "Reason/s for Dropping out ( Remarks from Teachers of POs/ SDWs",
  ],
  dropoutMonth: ["Specific Month of dropping out from School ( Please indicate Month and Year)"],
  schoolAwards: ["School Awards received by the child        non-academic/ academic-end of SY"],
  schoolActivities: ["School Activities Attended  by the Child"],
  schoolOrg: ["Membership to school organization/s", "Membership in any organization"],
  capacityBuilding: ["Capacity Building  Activities Attended by the child within the community"],
  mathGrade: ["Math Grade    ( 1st Grading Period)       For Children attending dear and mathemagica"],
  generalAverage: ["General Average       For Children attending dear and mathemagica"],
  readingPre: ["Level of Reading Skills (Pre- assessment) for Children Attending dear and mathemagica)"],
  readingPost: ["Level of Reading Skills (Post -assessment)"],
  ncCoc: ["NC/COC"],
  enrolledAssisted: ["Enrolled and Assisted in the Current SY"],
  visitDate: [" Date of Visit (format: month, day, year)"],
  assistanceSocial: ["Assistance  availed or received: (Social Protection)"],
  assistanceEdu: ["Type of assistance received by the child from ERDA ( Educational Assistance)"],
  assistanceDate: [
    "When did the child  received the Assistance   ( Specify Month)",
    "When did the child  availed or received the Assistance   ( Specify Month & year)",
  ],
  remarks: ["Remarks", "*REMARKS"],
  locationReporting: ["Location for Reporting"],
};

/** alias-normalized-header → canonical field name */
const HEADER_LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(HEADER_GROUPS)) {
    for (const alias of aliases) map.set(normalizeHeader(alias), canonical);
    map.set(normalizeHeader(canonical), canonical);
  }
  return map;
})();

/** A header→index map built once per sheet. */
type HeaderIndex = Map<string, number>;

function buildHeaderIndex(rawHeaders: unknown[]): HeaderIndex {
  const index: HeaderIndex = new Map();
  rawHeaders.forEach((header, i) => {
    const canonical = HEADER_LOOKUP.get(normalizeHeader(header));
    if (canonical && !index.has(canonical)) index.set(canonical, i);
  });
  return index;
}

function cell(row: unknown[], headers: HeaderIndex, field: string): unknown {
  const i = headers.get(field);
  return i === undefined ? null : (row[i] ?? null);
}

// ----------------------------------------------------------------------------
// 2. VALUE PARSERS (port of the Python clean_text / parse_* helpers)
// ----------------------------------------------------------------------------

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\xa0/g, " ").replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

function nonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return value !== 0;
  const text = cleanText(value)?.toLowerCase();
  return ["1", "y", "yes", "true", "t", "x", "checked", "present"].includes(text ?? "");
}

function parseInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Math.trunc(value);
  const text = cleanText(value)?.replace(/,/g, "");
  if (!text) return null;
  const n = Number.parseFloat(text);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const text = cleanText(value)?.replace(/,/g, "");
  if (!text) return null;
  const n = Number.parseFloat(text);
  return Number.isFinite(n) ? n : null;
}

const DATE_PATTERNS = [
  "%m/%d/%Y",
  "%m/%d/%y",
  "%Y-%m-%d",
  "%Y/%m/%d",
  "%b %d %Y",
  "%B %d %Y",
  "%d %b %Y",
  "%d %B %Y",
];

function applyDatePattern(text: string, pattern: string): Date | null {
  // Convert a strftime-style pattern into a regex with capture groups.
  const regex = pattern
    .replace("%Y", "(\\d{4})")
    .replace("%m", "(\\d{1,2})")
    .replace("%d", "(\\d{1,2})")
    .replace("%b", "([a-z]{3})")
    .replace("%B", "([a-z]+)")
    .replace(/[ .,]/g, "[ .,]*");
  const match = text.match(new RegExp(`^${regex}$`));
  if (!match) return null;

  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  let year = 0;
  let month = 0;
  let day = 0;
  const tokens = pattern.match(/%(Y|m|d|b|B)/g) ?? [];
  for (let g = 1; g < match.length; g++) {
    const token = tokens[g - 1];
    const raw = match[g];
    if (token === "%Y") year = Number.parseInt(raw, 10);
    else if (token === "%m") month = Number.parseInt(raw, 10) - 1;
    else if (token === "%d") day = Number.parseInt(raw, 10);
    else if (token === "%b" || token === "%B") {
      const idx = monthNames.indexOf(raw.slice(0, 3));
      if (idx === -1) return null;
      month = idx;
    }
  }
  const date = new Date(Date.UTC(year, month, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDate(value: unknown): string | null {
  // Returns an ISO 'YYYY-MM-DD' string (what Postgres `date` columns accept).
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = cleanText(value);
  if (!text) return null;
  const simplified = text.toLowerCase().replace(/[.,]+/g, "").replace(/\s+/g, " ").trim();
  for (const pattern of DATE_PATTERNS) {
    const date = applyDatePattern(simplified, pattern);
    if (date) return date.toISOString().slice(0, 10);
  }
  // Excel serial number (days since 1899-12-30) as a last resort.
  const serial = Number.parseFloat(simplified);
  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    const ms = (serial - 25569) * 86400 * 1000; // Excel → Unix epoch
    return new Date(ms).toISOString().slice(0, 10);
  }
  return null;
}

/** "SY 2017-18.xlsx" → "2017-2018" (the canonical school_year label). */
function inferSchoolYear(filename: string): string {
  const match = filename.match(/(\d{4})[-_](\d{2,4})/);
  if (!match) throw new Error(`Could not infer school year from filename: ${filename}`);
  const startYear = Number.parseInt(match[1], 10);
  let endYear =
    match[2].length === 4
      ? Number.parseInt(match[2], 10)
      : Number.parseInt(`${Math.floor(startYear / 100)}${match[2]}`, 10);
  if (endYear < startYear) endYear += 100;
  return `${startYear}-${endYear}`;
}

// ----------------------------------------------------------------------------
// 3. LOOKUP CACHE — preloaded once, mapped in memory (no N+1 queries)
// ----------------------------------------------------------------------------

type LookupTable =
  | "lookup_provinces"
  | "lookup_cities"
  | "lookup_grade_levels"
  | "lookup_classifications"
  | "lookup_cnsp_clusters"
  | "lookup_shs_tracks"
  | "lookup_education_schemes"
  | "lookup_house_ownership_types"
  | "lookup_dwelling_materials"
  | "lookup_water_supply_types"
  | "lookup_lighting_facility_types"
  | "lookup_toilet_facility_types"
  | "lookup_income_brackets";

class LookupCache {
  /** (table, normalized label) → UUID */
  private cache = new Map<string, string | null>();
  /** (provinceId, normalized city) → UUID (cities are scoped to a province) */
  private cityCache = new Map<string, string | null>();

  constructor(private client: SupabaseClient) {}

  /** Preload every row of every lookup table into memory before iterating files. */
  async preload(): Promise<void> {
    const tables: LookupTable[] = [
      "lookup_provinces",
      "lookup_cities",
      "lookup_grade_levels",
      "lookup_classifications",
      "lookup_cnsp_clusters",
      "lookup_shs_tracks",
      "lookup_education_schemes",
      "lookup_house_ownership_types",
      "lookup_dwelling_materials",
      "lookup_water_supply_types",
      "lookup_lighting_facility_types",
      "lookup_toilet_facility_types",
      "lookup_income_brackets",
    ];
    for (const table of tables) {
      const column = table === "lookup_income_brackets" ? "label" : "name";
      const { data, error } = await this.client.from(table).select(`id,${column}`);
      if (error) throw new Error(`Failed to preload ${table}: ${error.message}`);
      for (const row of data ?? []) {
        this.cache.set(this.key(table, row[column]), row.id as string);
      }
      console.log(`  cached ${data?.length ?? 0} rows from ${table}`);
    }
  }

  private key(table: string, label: string): string {
    return `${table}::${normalizeHeader(label)}`;
  }

  /**
   * Resolve a raw Excel string to its lookup UUID. If the label does not exist
   * yet, it is inserted once, cached, and reused for every subsequent row.
   */
  async resolve(table: LookupTable, rawValue: unknown): Promise<string | null> {
    const label = cleanText(rawValue);
    if (!label) return null;
    const key = this.key(table, label);
    if (this.cache.has(key)) return this.cache.get(key) ?? null;

    if (DRY_RUN) {
      this.cache.set(key, `dry-run:${table}`);
      return `dry-run:${table}`;
    }

    // Insert-on-conflict-do-nothing, then select — safe under concurrency.
    const column = table === "lookup_income_brackets" ? "label" : "name";
    const { error: insertError } = await this.client
      .from(table)
      .insert({ [column]: label } as Record<string, string>);
    if (insertError && insertError.code !== "23505" /* unique_violation */) {
      throw new Error(`Failed to insert ${table} "${label}": ${insertError.message}`);
    }
    const { data, error } = await this.client
      .from(table)
      .select("id")
      .ilike(column, label)
      .limit(1);
    if (error || !data?.length) {
      throw new Error(`Failed to resolve ${table} "${label}": ${error?.message ?? "not found"}`);
    }
    const id = data[0].id as string;
    this.cache.set(key, id);
    return id;
  }

  /** Cities are unique per (province_id, name), so the cache key includes the province. */
  async resolveCity(provinceId: string | null, rawValue: unknown): Promise<string | null> {
    const label = cleanText(rawValue);
    if (!label || !provinceId) return null;
    const key = `${provinceId}::${normalizeHeader(label)}`;
    if (this.cityCache.has(key)) return this.cityCache.get(key) ?? null;

    if (DRY_RUN) {
      this.cityCache.set(key, "dry-run:lookup_cities");
      return "dry-run:lookup_cities";
    }

    const { error: insertError } = await this.client
      .from("lookup_cities")
      .insert({ province_id: provinceId, name: label } as Record<string, string>);
    if (insertError && insertError.code !== "23505") {
      throw new Error(`Failed to insert city "${label}": ${insertError.message}`);
    }
    const { data, error } = await this.client
      .from("lookup_cities")
      .select("id")
      .eq("province_id", provinceId)
      .ilike("name", label)
      .limit(1);
    if (error || !data?.length) {
      throw new Error(`Failed to resolve city "${label}": ${error?.message ?? "not found"}`);
    }
    const id = data[0].id as string;
    this.cityCache.set(key, id);
    return id;
  }
}

// ----------------------------------------------------------------------------
// 4. STATS & LOGGING
// ----------------------------------------------------------------------------

const stats = {
  files: 0,
  rowsSeen: 0,
  rowsSkipped: 0,
  students: 0,
  enrollments: 0,
  household: 0,
  housing: 0,
  welfare: 0,
  academic: 0,
  assistance: 0,
  errors: 0,
};

function warn(message: string): void {
  stats.errors += 1;
  console.warn(`  WARN: ${message}`);
}

// ----------------------------------------------------------------------------
// 5. ROW TRANSFORMERS — Excel row → typed DB payloads
// ----------------------------------------------------------------------------

type StudentPayload = {
  child_code: string;
  surname: string | null;
  first_name: string | null;
  middle_initial: string | null;
  sex: string | null;
  date_of_birth: string | null;
  province_id: string | null;
  city_id: string | null;
  barangay: string | null;
  sitio_phase: string | null;
  complete_address: string | null;
};

async function buildStudentPayload(
  row: unknown[],
  headers: HeaderIndex,
  lookups: LookupCache,
): Promise<StudentPayload> {
  const rawSex = cleanText(cell(row, headers, "sex"));
  // Strictly normalize sex against the schema's check constraint
  // (`sex in ('Male','Female')`). Any unrecognized value is dropped so a
  // single dirty cell can't fail an entire bulk batch.
  const sexOut = (() => {
    if (!rawSex) return null;
    const normalized = rawSex.toLowerCase();
    if (["m", "male"].includes(normalized)) return "Male";
    if (["f", "female"].includes(normalized)) return "Female";
    return null;
  })(),
    sex = sexOut;

  const provinceId = await lookups.resolve("lookup_provinces", cell(row, headers, "province"));
  const cityId = await lookups.resolveCity(provinceId, cell(row, headers, "city"));

  return {
    child_code: cleanText(cell(row, headers, "childCode")) ?? "",
    surname: cleanText(cell(row, headers, "surname")),
    first_name: cleanText(cell(row, headers, "firstName")),
    middle_initial: cleanText(cell(row, headers, "middleInitial")),
    sex,
    date_of_birth: parseDate(cell(row, headers, "dateOfBirth")),
    province_id: provinceId,
    city_id: cityId,
    barangay: cleanText(cell(row, headers, "barangay")),
    sitio_phase: cleanText(cell(row, headers, "sitioPhase")),
    complete_address: cleanText(cell(row, headers, "completeAddress")),
  };
}

type EnrollmentPayload = {
  student_id: string;
  school_year: string;
  batch_number: string | null;
  intake_no: number | null;
  date_of_intake_interview: string | null;
  grade_level_id: string | null;
  shs_track_id: string | null;
  course_in_college: string | null;
  school_name: string | null;
  classification_id: string | null;
  dropout_reason: string | null;
  cnsp_cluster_id: string | null;
  education_status: string | null;
  location_for_reporting: string | null;
  remarks: string | null;
};

async function buildEnrollmentPayload(
  row: unknown[],
  headers: HeaderIndex,
  lookups: LookupCache,
  studentId: string,
  schoolYear: string,
): Promise<EnrollmentPayload> {
  return {
    student_id: studentId,
    school_year: schoolYear,
    batch_number: cleanText(cell(row, headers, "batchNumber")),
    intake_no: parseInt(cell(row, headers, "intakeNo")),
    date_of_intake_interview: parseDate(cell(row, headers, "dateOfIntake")),
    grade_level_id: await lookups.resolve("lookup_grade_levels", cell(row, headers, "gradeLevel")),
    shs_track_id: await lookups.resolve("lookup_shs_tracks", cell(row, headers, "shsTrack")),
    course_in_college: cleanText(cell(row, headers, "courseInCollege")),
    school_name: cleanText(cell(row, headers, "schoolName")),
    classification_id: await lookups.resolve(
      "lookup_classifications",
      cell(row, headers, "classification"),
    ),
    dropout_reason: cleanText(cell(row, headers, "dropoutReason")),
    cnsp_cluster_id: await lookups.resolve("lookup_cnsp_clusters", cell(row, headers, "cnsp")),
    education_status: cleanText(cell(row, headers, "educationStatus")),
    location_for_reporting: cleanText(cell(row, headers, "locationReporting")),
    remarks: cleanText(cell(row, headers, "remarks")),
  };
}

// ----------------------------------------------------------------------------
// 8. BULK LOAD (idempotent upserts, 500 rows per request)
// ----------------------------------------------------------------------------
// Performance strategy: per workbook, we first TRANSFORM every row in memory
// (resolving lookup UUIDs from the cache), then LOAD in bulk batches of 500
// rows per HTTP request. This turns ~9 network round trips per row into ~9
// per 500 rows — turning days of runtime into minutes.
// ----------------------------------------------------------------------------

const BATCH_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type ParsedRow = {
  location: string;
  childCode: string;
  student: StudentPayload | null;
  enrollment: Omit<EnrollmentPayload, "student_id"> | null;
  household: Record<string, unknown> | null;
  housing: Record<string, unknown> | null;
  welfare: Record<string, unknown> | null;
  academic: Record<string, unknown> | null;
  assistance: Record<string, unknown>[];
};

/** Build a child-table payload, or null when the row has no data for it. */
function childPayloadOrNull(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  const entries = Object.entries(payload).filter(([k]) => k !== "enrollment_record_id");
  return entries.some(([, v]) => nonEmpty(v)) ? payload : null;
}

/** Upsert students in bulk; conflict key = child_code. Returns child_code → id. */
async function bulkUpsertStudents(rows: ParsedRow[]): Promise<Map<string, string>> {
  const idByChildCode = new Map<string, string>();
  const uniqueStudents = new Map<string, StudentPayload>();
  for (const r of rows) if (r.student) uniqueStudents.set(r.student.child_code, r.student);

  for (const batch of chunk(Array.from(uniqueStudents.values()), BATCH_SIZE)) {
    if (DRY_RUN) {
      for (const s of batch) idByChildCode.set(s.child_code, `dry-run:student:${s.child_code}`);
      continue;
    }
    const { data, error } = await supabase
      .from("students")
      .upsert(batch, { onConflict: "child_code" })
      .select("id,child_code");

    if (!error && data) {
      for (const row of data) idByChildCode.set(row.child_code as string, row.id as string);
      continue;
    }

    // Zero data loss: a single dirty row can fail an ENTIRE batch and drop
    // otherwise-valid students. Fall back to row-by-row so each good student
    // is still written and only genuinely-bad rows are skipped/logged.
    warn(`students bulk upsert failed (${batch.length} rows), retrying individually: ${error?.message}`);
    for (const s of batch) {
      const { data: rowData, error: rowError } = await supabase
        .from("students")
        .upsert(s, { onConflict: "child_code" })
        .select("id,child_code")
        .single();
      if (rowError || !rowData) {
        warn(`students upsert failed for child_code=${s.child_code}: ${rowError?.message ?? "no row"}`);
        continue;
      }
      idByChildCode.set(s.child_code, rowData.id as string);
    }
  }
  return idByChildCode;
}

/**
 * Bulk upsert enrollment_records on (student_id, school_year).
 * Rows whose student has no UUID are dropped — their child-table writes are
 * skipped too (transactional safety).
 */
async function bulkUpsertEnrollments(
  rows: ParsedRow[],
  studentIds: Map<string, string>,
  schoolYear: string,
): Promise<Map<string, string>> {
  const idByEnrollment = new Map<string, string>(); // key: studentId|schoolYear
  // Dedupe by (student_id, school_year): the same child can appear on
  // multiple rows of a workbook, and Postgres cannot upsert the same
  // conflict key twice within one statement.
  const seen = new Set<string>();
  const batchPayloads: EnrollmentPayload[] = [];
  for (const r of rows) {
    const studentId = studentIds.get(r.childCode);
    if (!studentId || !r.enrollment) continue;
    const key = `${studentId}|${schoolYear}`;
    if (seen.has(key)) continue;
    seen.add(key);
    batchPayloads.push({ ...r.enrollment, student_id: studentId, school_year: schoolYear });
  }

  for (const batch of chunk(batchPayloads, BATCH_SIZE)) {
    if (DRY_RUN) {
      batch.forEach((p) => idByEnrollment.set(`${p.student_id}|${p.school_year}`, `dry-run:enrollment:${p.student_id}`));
      continue;
    }
    const { data, error } = await supabase
      .from("enrollment_records")
      .upsert(batch, { onConflict: "student_id,school_year" })
      .select("id,student_id,school_year");
    if (error) {
      warn(`enrollment_records bulk upsert failed (${batch.length} rows): ${error.message}`);
      // Zero data loss: fall back to row-by-row so only genuinely-bad
      // rows are skipped, and their child-table writes are skipped too.
      for (const p of batch) {
        const { data: d, error: e } = await supabase
          .from("enrollment_records")
          .upsert(p, { onConflict: "student_id,school_year" })
          .select("id,student_id,school_year")
          .single();
        if (e || !d) {
          warn(`enrollment upsert failed for student=${p.student_id} sy=${p.school_year}: ${e?.message ?? "no row"}`);
          continue;
        }
        idByEnrollment.set(`${d.student_id}|${d.school_year}`, d.id as string);
      }
      continue;
    }
    (data ?? []).forEach((row) => {
      idByEnrollment.set(`${row.student_id}|${row.school_year}`, row.id as string);
    });
  }
  return idByEnrollment;
}

async function bulkUpsertChildTable(
  table: string,
  rows: ParsedRow[],
  key: "household" | "housing" | "welfare" | "academic",
  studentIds: Map<string, string>,
  enrollmentIds: Map<string, string>,
  schoolYear: string,
): Promise<void> {
  const payloads: Record<string, unknown>[] = [];
  const seenEnroll = new Set<string>();
  for (const r of rows) {
    const payload = r[key];
    if (!payload) continue;
    const studentId = studentIds.get(r.childCode);
    const enrollmentId = studentId ? enrollmentIds.get(`${studentId}|${schoolYear}`) : undefined;
    if (!enrollmentId) continue; // transactional safety: skip orphans
    if (seenEnroll.has(enrollmentId)) continue; // dedupe: skip repeated child rows
    seenEnroll.add(enrollmentId);
    payloads.push({ ...payload, enrollment_record_id: enrollmentId });
  }

  for (const batch of chunk(payloads, BATCH_SIZE)) {
    if (DRY_RUN) {
      stats[key] += batch.length;
      continue;
    }
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: "enrollment_record_id" });
    if (error) {
      // Zero data loss: retry the batch one row at a time so a single
      // dirty row cannot drop its valid siblings from this table.
      warn(`${table} bulk upsert failed (${batch.length} rows), retrying individually: ${error.message}`);
      for (const p of batch) {
        const { error: e } = await supabase
          .from(table)
          .upsert(p, { onConflict: "enrollment_record_id" });
        if (e) {
          warn(`${table} upsert failed for enrollment=${String(p.enrollment_record_id)}: ${e.message}`);
          continue;
        }
        stats[key] += 1;
      }
      continue;
    }
    stats[key] += batch.length;
  }
}

async function bulkReplaceAssistance(
  rows: ParsedRow[],
  studentIds: Map<string, string>,
  enrollmentIds: Map<string, string>,
  schoolYear: string,
): Promise<void> {
  const enrollmentIdList: string[] = [];
  const inserts: Record<string, unknown>[] = [];

  for (const r of rows) {
    if (r.assistance.length === 0) continue;
    const studentId = studentIds.get(r.childCode);
    const enrollmentId = studentId ? enrollmentIds.get(`${studentId}|${schoolYear}`) : undefined;
    if (!enrollmentId) continue;
    enrollmentIdList.push(enrollmentId);
    for (const record of r.assistance) {
      inserts.push({ ...record, enrollment_record_id: enrollmentId });
    }
  }

  if (enrollmentIdList.length === 0) return;
  if (DRY_RUN) {
    stats.assistance += inserts.length;
    return;
  }

  for (const batch of chunk(enrollmentIdList, BATCH_SIZE)) {
    const del = await supabase
      .from("assistance_records")
      .delete()
      .in("enrollment_record_id", batch);
    if (del.error) {
      warn(`assistance_records delete failed: ${del.error.message}`);
      return;
    }
  }
  for (const batch of chunk(inserts, BATCH_SIZE)) {
    const ins = await supabase.from("assistance_records").insert(batch);
    if (ins.error) {
      warn(`assistance_records insert failed (${batch.length} rows): ${ins.error.message}`);
      continue;
    }
    stats.assistance += batch.length;
  }
}


// ----------------------------------------------------------------------------
// 7. PER-ROW TRANSFORM (no network — lookups come from the in-memory cache)
// ----------------------------------------------------------------------------

async function transformRow(
  row: unknown[],
  headers: HeaderIndex,
  lookups: LookupCache,
  schoolYear: string,
  location: string,
): Promise<ParsedRow | null> {
  const childCode = cleanText(cell(row, headers, "childCode"));
  if (!childCode) {
    stats.rowsSkipped += 1;
    warn(`${location}: missing Child Code; row skipped`);
    return null;
  }

  const student = await buildStudentPayload(row, headers, lookups);
  if (!student.surname || !student.first_name) {
    stats.rowsSkipped += 1;
    warn(`${location} child_code=${childCode}: missing surname/first name; row skipped`);
    return null;
  }

  const enrollment = await buildEnrollmentPayload(
    row,
    headers,
    lookups,
    "PENDING", // student_id is stamped in during the LOAD phase
    schoolYear,
  );
  const { student_id: _omit, ...enrollmentRest } = enrollment;

  const incomeLabel = cleanText(cell(row, headers, "income"));
  const household = childPayloadOrNull({
    hh_head_surname: cleanText(cell(row, headers, "hhSurname")),
    hh_head_first_name: cleanText(cell(row, headers, "hhFirstName")),
    hh_head_mi: cleanText(cell(row, headers, "hhMi")),
    occupation_of_hh_head: cleanText(cell(row, headers, "hhOccupation")),
    income_bracket_id: incomeLabel
      ? await lookups.resolve("lookup_income_brackets", incomeLabel)
      : null,
    pci_below_800: parseBool(cell(row, headers, "income")),
  });

  const housing = childPayloadOrNull({
    house_ownership_id: await lookups.resolve(
      "lookup_house_ownership_types",
      cell(row, headers, "houseOwnership"),
    ),
    size_of_dwelling: cleanText(cell(row, headers, "dwellingSize")),
    materials_id: await lookups.resolve("lookup_dwelling_materials", cell(row, headers, "materials")),
    water_supply_id: await lookups.resolve(
      "lookup_water_supply_types",
      cell(row, headers, "waterSupply"),
    ),
    lighting_facility_id: await lookups.resolve(
      "lookup_lighting_facility_types",
      cell(row, headers, "lighting"),
    ),
    toilet_facility_id: await lookups.resolve(
      "lookup_toilet_facility_types",
      cell(row, headers, "toilet"),
    ),
    furnitures: cleanText(cell(row, headers, "furnitures")),
  });

  const welfare = childPayloadOrNull({
    presently_served_by_welfare_agency: parseBool(cell(row, headers, "presentlyServed")),
    welfare_agency_name: cleanText(cell(row, headers, "welfareAgency")),
    type_of_service_availed: cleanText(cell(row, headers, "typeOfService")),
    is_organization_member: parseBool(cell(row, headers, "schoolOrg")),
    organization_type: cleanText(cell(row, headers, "orgType")),
    education_scheme_id: await lookups.resolve(
      "lookup_education_schemes",
      cell(row, headers, "educationScheme"),
    ),
    social_protection_program: cleanText(cell(row, headers, "socialProtection")),
    tie_up_partner_name: cleanText(cell(row, headers, "tieUpPartner")),
    staff_in_charge: cleanText(cell(row, headers, "staffInCharge")),
    funder_name: cleanText(cell(row, headers, "funder")),
  });

  const academic = childPayloadOrNull({
    nc_coc: cleanText(cell(row, headers, "ncCoc")),
    enrolled_and_assisted_current_sy: parseBool(cell(row, headers, "enrolledAssisted")),
    education_status_as_beneficiary: cleanText(cell(row, headers, "educationStatus")),
    reason_for_being_inactive: cleanText(cell(row, headers, "reasonInactive")),
    graduate_remarks: cleanText(cell(row, headers, "graduateRemarks")),
    dropped_out_past_4_months: parseBool(cell(row, headers, "droppedOut4Months")),
    dropout_reason_teacher_remarks: cleanText(cell(row, headers, "dropoutReason")),
    dropout_month: cleanText(cell(row, headers, "dropoutMonth")),
    school_awards: cleanText(cell(row, headers, "schoolAwards")),
    school_activities_attended: cleanText(cell(row, headers, "schoolActivities")),
    school_org_membership: cleanText(cell(row, headers, "schoolOrg")),
    capacity_building_activities: cleanText(cell(row, headers, "capacityBuilding")),
    math_grade_1st_period: parseDecimal(cell(row, headers, "mathGrade")),
    general_average: parseDecimal(cell(row, headers, "generalAverage")),
    reading_skills_pre_assessment: cleanText(cell(row, headers, "readingPre")),
    reading_skills_post_assessment: cleanText(cell(row, headers, "readingPost")),
  });

  // Assistance: delete-then-insert at load time keeps this idempotent
  // (assistance_records has no natural unique key).
  const assistance: Record<string, unknown>[] = [];
  const visitDate = parseDate(cell(row, headers, "visitDate"));
  const remarks = cleanText(cell(row, headers, "remarks"));
  const socialType = cleanText(cell(row, headers, "assistanceSocial"));
  const assistDate = parseDate(cell(row, headers, "assistanceDate"));
  if (nonEmpty(socialType) || assistDate || visitDate) {
    assistance.push({
      assistance_category: "Social Protection",
      assistance_type: socialType,
      date_received: assistDate,
      visit_date: visitDate,
      remarks,
    });
  }
  const eduType = cleanText(cell(row, headers, "assistanceEdu"));
  if (nonEmpty(eduType) || assistDate) {
    assistance.push({
      assistance_category: "Educational Assistance",
      assistance_type: eduType,
      date_received: assistDate,
      visit_date: visitDate,
      remarks,
    });
  }

  return {
    location,
    childCode,
    student,
    enrollment: enrollmentRest,
    household,
    housing,
    welfare,
    academic,
    assistance,
  };
}

async function upsertHousehold(
  enrollmentId: string,
  row: unknown[],
  headers: HeaderIndex,
  lookups: LookupCache,
): Promise<void> {
  const incomeLabel = cleanText(cell(row, headers, "income"));
  const payload = {
    enrollment_record_id: enrollmentId,
    hh_head_surname: cleanText(cell(row, headers, "hhSurname")),
    hh_head_first_name: cleanText(cell(row, headers, "hhFirstName")),
    hh_head_mi: cleanText(cell(row, headers, "hhMi")),
    occupation_of_hh_head: cleanText(cell(row, headers, "hhOccupation")),
    income_bracket_id: incomeLabel
      ? await lookups.resolve("lookup_income_brackets", incomeLabel)
      : null,
    pci_below_800: parseBool(cell(row, headers, "income")),
  };
  const hasData = Object.entries(payload).some(
    ([key, value]) => key !== "enrollment_record_id" && nonEmpty(value),
  );
  if (!hasData) return;
  if (DRY_RUN) {
    stats.household += 1;
    return;
  }
  const { error } = await supabase
    .from("household_snapshots")
    .upsert(payload, { onConflict: "enrollment_record_id" });
  if (error) throw new Error(`household_snapshots upsert failed: ${error.message}`);
  stats.household += 1;
}

async function upsertHousing(
  enrollmentId: string,
  row: unknown[],
  headers: HeaderIndex,
  lookups: LookupCache,
): Promise<void> {
  const payload = {
    enrollment_record_id: enrollmentId,
    house_ownership_id: await lookups.resolve(
      "lookup_house_ownership_types",
      cell(row, headers, "houseOwnership"),
    ),
    size_of_dwelling: cleanText(cell(row, headers, "dwellingSize")),
    materials_id: await lookups.resolve("lookup_dwelling_materials", cell(row, headers, "materials")),
    water_supply_id: await lookups.resolve(
      "lookup_water_supply_types",
      cell(row, headers, "waterSupply"),
    ),
    lighting_facility_id: await lookups.resolve(
      "lookup_lighting_facility_types",
      cell(row, headers, "lighting"),
    ),
    toilet_facility_id: await lookups.resolve(
      "lookup_toilet_facility_types",
      cell(row, headers, "toilet"),
    ),
    furnitures: cleanText(cell(row, headers, "furnitures")),
  };
  const hasData = Object.entries(payload).some(
    ([key, value]) => key !== "enrollment_record_id" && nonEmpty(value),
  );
  if (!hasData) return;
  if (DRY_RUN) {
    stats.housing += 1;
    return;
  }
  const { error } = await supabase
    .from("housing_conditions")
    .upsert(payload, { onConflict: "enrollment_record_id" });
  if (error) throw new Error(`housing_conditions upsert failed: ${error.message}`);
  stats.housing += 1;
}

async function upsertWelfare(
  enrollmentId: string,
  row: unknown[],
  headers: HeaderIndex,
  lookups: LookupCache,
): Promise<void> {
  const payload = {
    enrollment_record_id: enrollmentId,
    presently_served_by_welfare_agency: parseBool(cell(row, headers, "presentlyServed")),
    welfare_agency_name: cleanText(cell(row, headers, "welfareAgency")),
    type_of_service_availed: cleanText(cell(row, headers, "typeOfService")),
    is_organization_member: parseBool(cell(row, headers, "schoolOrg")),
    organization_type: cleanText(cell(row, headers, "orgType")),
    education_scheme_id: await lookups.resolve(
      "lookup_education_schemes",
      cell(row, headers, "educationScheme"),
    ),
    social_protection_program: cleanText(cell(row, headers, "socialProtection")),
    tie_up_partner_name: cleanText(cell(row, headers, "tieUpPartner")),
    staff_in_charge: cleanText(cell(row, headers, "staffInCharge")),
    funder_name: cleanText(cell(row, headers, "funder")),
  };
  const hasData = Object.entries(payload).some(
    ([key, value]) => key !== "enrollment_record_id" && nonEmpty(value),
  );
  if (!hasData) return;
  if (DRY_RUN) {
    stats.welfare += 1;
    return;
  }
  const { error } = await supabase
    .from("welfare_services")
    .upsert(payload, { onConflict: "enrollment_record_id" });
  if (error) throw new Error(`welfare_services upsert failed: ${error.message}`);
  stats.welfare += 1;
}

async function upsertAcademic(
  enrollmentId: string,
  row: unknown[],
  headers: HeaderIndex,
): Promise<void> {
  const payload = {
    enrollment_record_id: enrollmentId,
    nc_coc: cleanText(cell(row, headers, "ncCoc")),
    enrolled_and_assisted_current_sy: parseBool(cell(row, headers, "enrolledAssisted")),
    education_status_as_beneficiary: cleanText(cell(row, headers, "educationStatus")),
    reason_for_being_inactive: cleanText(cell(row, headers, "reasonInactive")),
    graduate_remarks: cleanText(cell(row, headers, "graduateRemarks")),
    dropped_out_past_4_months: parseBool(cell(row, headers, "droppedOut4Months")),
    dropout_reason_teacher_remarks: cleanText(cell(row, headers, "dropoutReason")),
    dropout_month: cleanText(cell(row, headers, "dropoutMonth")),
    school_awards: cleanText(cell(row, headers, "schoolAwards")),
    school_activities_attended: cleanText(cell(row, headers, "schoolActivities")),
    school_org_membership: cleanText(cell(row, headers, "schoolOrg")),
    capacity_building_activities: cleanText(cell(row, headers, "capacityBuilding")),
    math_grade_1st_period: parseDecimal(cell(row, headers, "mathGrade")),
    general_average: parseDecimal(cell(row, headers, "generalAverage")),
    reading_skills_pre_assessment: cleanText(cell(row, headers, "readingPre")),
    reading_skills_post_assessment: cleanText(cell(row, headers, "readingPost")),
  };
  const hasData = Object.entries(payload).some(
    ([key, value]) => key !== "enrollment_record_id" && nonEmpty(value),
  );
  if (!hasData) return;
  if (DRY_RUN) {
    stats.academic += 1;
    return;
  }
  const { error } = await supabase
    .from("academic_performance")
    .upsert(payload, { onConflict: "enrollment_record_id" });
  if (error) throw new Error(`academic_performance upsert failed: ${error.message}`);
  stats.academic += 1;
}

async function replaceAssistance(
  enrollmentId: string,
  row: unknown[],
  headers: HeaderIndex,
): Promise<void> {
  const visitDate = parseDate(cell(row, headers, "visitDate"));
  const remarks = cleanText(cell(row, headers, "remarks"));

  const records: Record<string, unknown>[] = [];

  const socialType = cleanText(cell(row, headers, "assistanceSocial"));
  const socialDate = parseDate(cell(row, headers, "assistanceDate"));
  if (nonEmpty(socialType) || socialDate || visitDate) {
    records.push({
      assistance_category: "Social Protection",
      assistance_type: socialType,
      date_received: socialDate,
      visit_date: visitDate,
      remarks,
    });
  }

  const eduType = cleanText(cell(row, headers, "assistanceEdu"));
  const eduDate = parseDate(cell(row, headers, "assistanceDate"));
  if (nonEmpty(eduType) || eduDate) {
    records.push({
      assistance_category: "Educational Assistance",
      assistance_type: eduType,
      date_received: eduDate,
      visit_date: visitDate,
      remarks,
    });
  }

  if (records.length === 0) return;
  if (DRY_RUN) {
    stats.assistance += records.length;
    return;
  }

  // Delete-then-insert keeps this idempotent: assistance_records has no
  // natural unique key, so re-running would otherwise duplicate rows.
  const del = await supabase
    .from("assistance_records")
    .delete()
    .eq("enrollment_record_id", enrollmentId);
  if (del.error) throw new Error(`assistance_records delete failed: ${del.error.message}`);

  const ins = await supabase
    .from("assistance_records")
    .insert(records.map((r) => ({ ...r, enrollment_record_id: enrollmentId })));
  if (ins.error) throw new Error(`assistance_records insert failed: ${ins.error.message}`);
  stats.assistance += records.length;
}

// ----------------------------------------------------------------------------
// 9. WORKBOOK PROCESSING — two-phase: TRANSFORM all rows, then bulk LOAD
// ----------------------------------------------------------------------------

/** Picks the sheet whose first row looks like the data table (has "Child Code"). */
function chooseDataSheet(workbook: XLSX.WorkBook): string {
  let bestSheet = workbook.SheetNames[0];
  let bestScore = -1;
  for (const name of workbook.SheetNames) {
    if (/^(reference|pivot)$/i.test(name.trim())) continue;
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
    const firstRow: unknown[] = rows[0] ?? [];
    let score = firstRow.filter((v: unknown) => nonEmpty(v)).length;
    if (firstRow.some((v: unknown) => normalizeHeader(v) === normalizeHeader("Child Code"))) {
      score += 100;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSheet = name;
    }
  }
  return bestSheet;
}

async function processWorkbook(filePath: string, lookups: LookupCache): Promise<void> {
  const filename = filePath.split(/[\\/]/).pop() ?? filePath;
  const schoolYear = inferSchoolYear(filename); // "SY 2017-18.xlsx" → "2017-2018"
  console.log(`\n▶ ${filename}  [${schoolYear}]`);

  const workbook = XLSX.read(readFileSync(filePath), { type: "buffer", cellDates: true });
  const sheetName = chooseDataSheet(workbook);
  const sheet = workbook.Sheets[sheetName];

  // header:1 → array-of-arrays; defval:null keeps column indexes aligned.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  if (rows.length < 2) {
    console.log("  (no data rows)");
    return;
  }
  const headers = buildHeaderIndex(rows[0]);
  console.log(`  sheet "${sheetName}" — ${rows.length - 1} data rows`);

  // ---- PHASE 1: TRANSFORM (in-memory, no writes) ----
  const parsed: ParsedRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some(nonEmpty)) {
      stats.rowsSkipped += 1;
      continue;
    }
    stats.rowsSeen += 1;
    const parsedRow = await transformRow(
      row,
      headers,
      lookups,
      schoolYear,
      `${filename}:row${i + 1}`,
    );
    if (parsedRow) parsed.push(parsedRow);
    if (stats.rowsSeen % 2500 === 0) console.log(`  … transformed ${stats.rowsSeen} rows`);
  }
  console.log(`  transformed ${parsed.length} valid rows — loading…`);

  // ---- PHASE 2: LOAD (bulk, idempotent) ----
  const studentIds = await bulkUpsertStudents(parsed);
  stats.students += studentIds.size;

  const enrollmentIds = await bulkUpsertEnrollments(parsed, studentIds, schoolYear);
  stats.enrollments += enrollmentIds.size;

  await bulkUpsertChildTable("household_snapshots", parsed, "household", studentIds, enrollmentIds, schoolYear);
  await bulkUpsertChildTable("housing_conditions", parsed, "housing", studentIds, enrollmentIds, schoolYear);
  await bulkUpsertChildTable("welfare_services", parsed, "welfare", studentIds, enrollmentIds, schoolYear);
  await bulkUpsertChildTable("academic_performance", parsed, "academic", studentIds, enrollmentIds, schoolYear);
  await bulkReplaceAssistance(parsed, studentIds, enrollmentIds, schoolYear);

  console.log(`  done: students=${studentIds.size} enrollments=${enrollmentIds.size}`);
  stats.files += 1;
}

// ----------------------------------------------------------------------------
// 10. MAIN
// ----------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(
    DRY_RUN
      ? "=== ERDA ETL — DRY RUN (no database writes) ==="
      : "=== ERDA ETL — LIVE MIGRATION ===",
  );

  const files = readdirSync(YEARLY_DIR)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"))
    .sort();
  if (files.length === 0) {
    console.error(`No .xlsx files found in ${YEARLY_DIR}`);
    process.exit(1);
  }
  console.log(`Found ${files.length} workbook(s): ${files.join(", ")}`);

  // PERFORMANCE: preload every lookup table ONCE before touching any file.
  const lookups = new LookupCache(supabase);
  if (!DRY_RUN) {
    console.log("\nPreloading lookup tables…");
    await lookups.preload();
  }

  for (const file of files) {
    await processWorkbook(join(YEARLY_DIR, file), lookups);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`files:              ${stats.files}`);
  console.log(`rows seen:          ${stats.rowsSeen}`);
  console.log(`rows skipped/err:   ${stats.rowsSkipped}`);
  console.log(`student upserts:    ${stats.students}`);
  console.log(`enrollment upserts: ${stats.enrollments}`);
  console.log(`household:          ${stats.household}`);
  console.log(`housing:            ${stats.housing}`);
  console.log(`welfare:            ${stats.welfare}`);
  console.log(`academic:           ${stats.academic}`);
  console.log(`assistance rows:    ${stats.assistance}`);
  console.log(`warnings:           ${stats.errors}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });