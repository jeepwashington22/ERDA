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

export type DashboardSummary = {
  totalStudents: number;
  totalGradeSubmissions: number;
  currentUserProfile: {
    fullName: string | null;
    role: string;
    isActive: boolean;
  } | null;
  recentSubmissions: DashboardRecentSubmission[];
};

type CountRow = {
  count: string;
};

type ProfileRow = {
  full_name: string | null;
  role: string;
  is_active: boolean;
};

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

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const [studentRows, gradeRows, profileRows, recentRows] = await Promise.all([
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
  ]);

  return {
    totalStudents: Number(studentRows[0]?.count ?? 0),
    totalGradeSubmissions: Number(gradeRows[0]?.count ?? 0),
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
  };
}