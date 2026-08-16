import { queryPostgres } from "../lib/postgres";

export type StudentListRow = {
  id: string;
  childCode: string;
  surname: string | null;
  firstName: string | null;
  middleInitial: string | null;
  fullName: string;
  sex: string | null;
  dateOfBirth: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
  sitioPhase: string | null;
  completeAddress: string | null;
  gradeLevel: string | null;
  latestSchoolYear: string | null;
  schoolName: string | null;
  educationStatus: string | null;
};

export type StudentRegistryFilters = {
  search?: string;
  gradeLevel?: string;
  schoolYear?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type StudentRegistryResult = {
  students: StudentListRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getStudentRegistryRows(
  filters: StudentRegistryFilters = {},
): Promise<StudentRegistryResult> {
  const {
    search = "",
    gradeLevel = "",
    schoolYear = "",
    status = "",
    page = 1,
    pageSize = 25,
  } = filters;

  const offset = (page - 1) * pageSize;

  // Split the search into individual words so "Juan Dela Cruz" or
  // "Dela Cruz Juan" both match regardless of word order — each word just
  // needs to appear SOMEWHERE in the full name or child code.
  const searchTerms = search.trim().split(/\s+/).filter(Boolean);

  // Build the search clause dynamically: one ILIKE pair per word, ANDed
  // together, checked against the full concatenated name (in both name
  // orders, since Excel data isn't consistently "First Last" vs "Last, First")
  // and the child code.
  const params: (string | number)[] = [];
  let searchClause = "true";

  if (searchTerms.length > 0) {
    const wordClauses = searchTerms.map((term) => {
      params.push(`%${term}%`);
      const p = `$${params.length}`;
      return `(
        concat_ws(' ', s.first_name, s.middle_initial, s.surname) ilike ${p}
        or concat_ws(' ', s.surname, s.first_name, s.middle_initial) ilike ${p}
        or s.child_code ilike ${p}
      )`;
    });
    searchClause = wordClauses.join(" and ");
  }

  params.push(gradeLevel);
  const gradeParam = `$${params.length}`;
  params.push(schoolYear);
  const yearParam = `$${params.length}`;
  params.push(status);
  const statusParam = `$${params.length}`;

  const baseQuery = `
    from students s
    left join lookup_provinces lp on lp.id = s.province_id
    left join lookup_cities lc on lc.id = s.city_id
    left join lateral (
      select er.school_year, er.school_name, er.education_status, er.grade_level_id
      from enrollment_records er
      where er.student_id = s.id
      order by er.school_year desc
      limit 1
    ) er on true
    left join lookup_grade_levels gl on gl.id = er.grade_level_id
    where
      ${searchClause}
      and (${gradeParam} = '' or gl.name = ${gradeParam})
      and (${yearParam} = '' or er.school_year = ${yearParam})
      and (${statusParam} = '' or er.education_status = ${statusParam})
  `;

  const [countResult, rowsResult] = await Promise.all([
    queryPostgres<{ count: string }>(`select count(*) ${baseQuery}`, params),

    queryPostgres<{
      id: string;
      child_code: string;
      surname: string | null;
      first_name: string | null;
      middle_initial: string | null;
      full_name: string;
      sex: string | null;
      date_of_birth: string | null;
      province: string | null;
      city: string | null;
      barangay: string | null;
      sitio_phase: string | null;
      complete_address: string | null;
      grade_level: string | null;
      school_year: string | null;
      school_name: string | null;
      education_status: string | null;
    }>(
      `select
         s.id,
         s.child_code,
         s.surname,
         s.first_name,
         s.middle_initial,
         concat_ws(' ', s.surname, s.first_name, s.middle_initial) as full_name,
         s.sex,
         s.date_of_birth::text as date_of_birth,
         lp.name as province,
         lc.name as city,
         s.barangay,
         s.sitio_phase,
         s.complete_address,
         gl.name as grade_level,
         er.school_year,
         er.school_name,
         er.education_status
       ${baseQuery}
       order by s.surname, s.first_name
       limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, pageSize, offset],
    ),
  ]);

  const totalCount = parseInt(countResult[0].count, 10);

  const students = rowsResult.map((row) => ({
    id: row.id,
    childCode: row.child_code,
    surname: row.surname,
    firstName: row.first_name,
    middleInitial: row.middle_initial,
    fullName: row.full_name,
    sex: row.sex,
    dateOfBirth: row.date_of_birth,
    province: row.province,
    city: row.city,
    barangay: row.barangay,
    sitioPhase: row.sitio_phase,
    completeAddress: row.complete_address,
    gradeLevel: row.grade_level,
    latestSchoolYear: row.school_year,
    schoolName: row.school_name,
    educationStatus: row.education_status,
  }));

  return {
    students,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

/**
 * Distinct values for the filter dropdowns. Cheap enough to run per page
 * load for now — wrap in cached() from lib/redis.ts once traffic grows,
 * since these change rarely (only when new grade levels/years/statuses
 * appear in the data).
 */
export async function getStudentFilterOptions(): Promise<{
  gradeLevels: string[];
  schoolYears: string[];
  statuses: string[];
}> {
  const [gradeLevels, schoolYears, statuses] = await Promise.all([
    queryPostgres<{ name: string }>(
      "select name from lookup_grade_levels order by sort_order nulls last, name",
    ),
    queryPostgres<{ school_year: string }>(
      "select distinct school_year from enrollment_records order by school_year desc",
    ),
    queryPostgres<{ education_status: string }>(
      "select distinct education_status from enrollment_records where education_status is not null order by education_status",
    ),
  ]);

  return {
    gradeLevels: gradeLevels.map((r) => r.name),
    schoolYears: schoolYears.map((r) => r.school_year),
    statuses: statuses.map((r) => r.education_status),
  };
}