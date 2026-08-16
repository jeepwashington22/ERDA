import { backendConfig } from "../lib/backend-config";
import { queryPostgres } from "../lib/postgres";

export type DashboardRecentSubmission = {
  enrollmentRecordId: string;
  schoolYear: string;
  studentName: string;
  childCode: string;
  gradeLevel: string | null;
  generalAverage: string | null;
  mathGrade1stPeriod: string | null;
  createdAt: string;
};

export type ProvinceStudentCount = {
  provinceId: string;
  provinceName: string;
  studentCount: number;
};

export type ProvinceYearTrendPoint = {
  provinceName: string;
  schoolYear: string;
  studentCount: number;
};

export type ProvinceCoverage = {
  provinceId: string;
  provinceName: string;
  totalStudents: number;
  studentsWithSubmissions: number;
  coveragePercent: number;
};

export type DashboardFilters = {
  provinceId?: string;
  schoolYear?: string;
};

export type DashboardSummary = {
  totalStudents: number;
  totalGradeSubmissions: number;
  totalProvincesCovered: number;
  currentUserProfile: {
    fullName: string | null;
    role: string;
    isActive: boolean;
  } | null;
  recentSubmissions: DashboardRecentSubmission[];
  studentsByProvince: ProvinceStudentCount[];
  provinceYearTrend: ProvinceYearTrendPoint[];
  provinceCoverage: ProvinceCoverage[];
  provinceOptions: { id: string; name: string }[];
  schoolYearOptions: string[];
  databaseUnavailable: boolean;
};

type CountRow = { count: string };
type ProfileRow = { full_name: string | null; role: string; is_active: boolean };
type RecentSubmissionRow = {
  enrollment_record_id: string;
  school_year: string;
  student_name: string;
  child_code: string;
  grade_level: string | null;
  general_average: string | null;
  math_grade_1st_period: string | null;
  created_at: string;
};
type ProvinceCountRow = { province_id: string; province_name: string; student_count: string };
type ProvinceYearRow = { province_name: string; school_year: string; student_count: string };
type ProvinceCoverageRow = {
  province_id: string;
  province_name: string;
  total_students: string;
  students_with_submissions: string;
  coverage_percent: string | null;
};

export async function getDashboardSummary(
  userId: string,
  filters: DashboardFilters = {},
): Promise<DashboardSummary> {
  if (!backendConfig.supabasePoolUrl) {
    return {
      totalStudents: 0,
      totalGradeSubmissions: 0,
      totalProvincesCovered: 0,
      currentUserProfile: null,
      recentSubmissions: [],
      studentsByProvince: [],
      provinceYearTrend: [],
      provinceCoverage: [],
      provinceOptions: [],
      schoolYearOptions: [],
      databaseUnavailable: true,
    };
  }

  const provinceId = filters.provinceId ?? null;
  const schoolYear = filters.schoolYear ?? null;

  const [
    studentRows,
    gradeRows,
    profileRows,
    recentRows,
    provinceRows,
    provinceYearRows,
    coverageRows,
    provinceOptionRows,
    schoolYearOptionRows,
  ] = await Promise.all([
    queryPostgres<CountRow>("select count(*)::text as count from students"),
    queryPostgres<CountRow>("select count(*)::text as count from academic_performance"),
    queryPostgres<ProfileRow>(
      "select full_name, role, is_active from user_profiles where id = $1 limit 1",
      [userId],
    ),
    queryPostgres<RecentSubmissionRow>(
      `select
         er.id as enrollment_record_id,
         er.school_year,
         concat_ws(', ', s.surname, s.first_name) as student_name,
         s.child_code,
         gl.name as grade_level,
         ap.general_average::text as general_average,
         ap.math_grade_1st_period::text as math_grade_1st_period,
         er.created_at::text as created_at
       from academic_performance ap
       join enrollment_records er on er.id = ap.enrollment_record_id
       join students s on s.id = er.student_id
       left join lookup_grade_levels gl on gl.id = er.grade_level_id
       order by er.created_at desc
       limit 5`,
    ),
    queryPostgres<ProvinceCountRow>(
      `select
         lp.id as province_id,
         lp.name as province_name,
         count(distinct s.id) as student_count
       from lookup_provinces lp
       left join lookup_cities lc on lc.province_id = lp.id
       left join students s on s.city_id = lc.id
       where ($1::uuid is null or lp.id = $1)
       group by lp.id, lp.name
       order by student_count desc`,
      [provinceId],
    ),
    queryPostgres<ProvinceYearRow>(
      `select
         lp.name as province_name,
         er.school_year,
         count(distinct s.id) as student_count
       from enrollment_records er
       join students s on s.id = er.student_id
       join lookup_cities lc on lc.id = s.city_id
       join lookup_provinces lp on lp.id = lc.province_id
       where ($1::uuid is null or lp.id = $1)
         and ($2::text is null or er.school_year = $2)
       group by lp.name, er.school_year
       order by er.school_year`,
      [provinceId, schoolYear],
    ),
    queryPostgres<ProvinceCoverageRow>(
      `select
         lp.id as province_id,
         lp.name as province_name,
         count(distinct s.id) as total_students,
         count(distinct case when ap.id is not null then s.id end) as students_with_submissions,
         round(
           100.0 * count(distinct case when ap.id is not null then s.id end)
           / nullif(count(distinct s.id), 0), 1
         )::text as coverage_percent
       from lookup_provinces lp
       join lookup_cities lc on lc.province_id = lp.id
       join students s on s.city_id = lc.id
       left join enrollment_records er on er.student_id = s.id
         and ($2::text is null or er.school_year = $2)
       left join academic_performance ap on ap.enrollment_record_id = er.id
       where ($1::uuid is null or lp.id = $1)
       group by lp.id, lp.name
       order by total_students desc`,
      [provinceId, schoolYear],
    ),
    queryPostgres<{ id: string; name: string }>(
      "select id, name from lookup_provinces order by name asc",
    ),
    queryPostgres<{ school_year: string }>(
      "select distinct school_year from enrollment_records order by school_year desc",
    ),
  ]);

  return {
    totalStudents: Number(studentRows[0]?.count ?? 0),
    totalGradeSubmissions: Number(gradeRows[0]?.count ?? 0),
    totalProvincesCovered: provinceRows.filter((r) => Number(r.student_count) > 0).length,
    currentUserProfile: profileRows[0]
      ? {
          fullName: profileRows[0].full_name,
          role: profileRows[0].role,
          isActive: profileRows[0].is_active,
        }
      : null,
    recentSubmissions: recentRows.map((row) => ({
      enrollmentRecordId: row.enrollment_record_id,
      schoolYear: row.school_year,
      studentName: row.student_name,
      childCode: row.child_code,
      gradeLevel: row.grade_level,
      generalAverage: row.general_average,
      mathGrade1stPeriod: row.math_grade_1st_period,
      createdAt: row.created_at,
    })),
    studentsByProvince: provinceRows.map((r) => ({
      provinceId: r.province_id,
      provinceName: r.province_name,
      studentCount: Number(r.student_count),
    })),
    provinceYearTrend: provinceYearRows.map((r) => ({
      provinceName: r.province_name,
      schoolYear: r.school_year,
      studentCount: Number(r.student_count),
    })),
    provinceCoverage: coverageRows.map((r) => ({
      provinceId: r.province_id,
      provinceName: r.province_name,
      totalStudents: Number(r.total_students),
      studentsWithSubmissions: Number(r.students_with_submissions),
      coveragePercent: Number(r.coverage_percent ?? 0),
    })),
    provinceOptions: provinceOptionRows,
    schoolYearOptions: schoolYearOptionRows.map((r) => r.school_year),
    databaseUnavailable: false,
  };
}