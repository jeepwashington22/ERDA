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

export async function getStudentRegistryRows(limit = 200): Promise<StudentListRow[]> {
  const rows = await queryPostgres<{
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
     order by s.surname, s.first_name
     limit $1`,
    [limit],
  );

  return rows.map((row) => ({
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
}
