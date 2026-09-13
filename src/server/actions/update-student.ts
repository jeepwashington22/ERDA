// src/server/actions/update-student.ts
//
// Server Action that saves edits to a student's information.
//
// SECURITY MODEL (mirrors create-user-account.ts):
// 1. "use server" — the code only ever runs on the server; the browser just
//    calls this function and Next.js handles the request.
// 2. We never trust client-supplied role metadata — the caller's role is
//    re-checked against user_profiles in the database before any write.
// 3. Only admin and super_admin may edit student records; staff read-only.
// 4. All input is validated and trimmed before it touches Postgres; unknown
//    values never become SQL (parameterized queries throughout).

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { queryPostgres } from "@/server/lib/postgres";

export type UpdateStudentInfoInput = {
  studentId: string;
  // Permanent identity (students table)
  surname: string;
  firstName: string;
  middleInitial: string | null;
  sex: string | null; // 'Male' | 'Female' | null
  dateOfBirth: string | null; // ISO yyyy-mm-dd
  province: string | null; // lookup_provinces.name
  city: string | null; // lookup_cities.name
  barangay: string | null;
  sitioPhase: string | null;
  completeAddress: string | null;
  // Latest-enrollment fields (enrollment_records table)
  schoolName: string | null;
  courseInCollege: string | null;
  educationStatus: string | null;
  locationForReporting: string | null;
  remarks: string | null;
};

export type UpdateStudentInfoResult =
  | { success: true }
  | { success: false; error: string };

const trimmed = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

export async function updateStudentInfo(
  input: UpdateStudentInfoInput,
): Promise<UpdateStudentInfoResult> {
  // ---- 1. Authenticate and authorize the caller ----
  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();

  if (sessionError || !sessionData.user) {
    return { success: false, error: "Not authenticated." };
  }

  let callerProfile: { role: string; is_active: boolean } | null = null;
  try {
    const rows = await queryPostgres<{ role: string; is_active: boolean }>(
      "select role, is_active from user_profiles where id = $1 limit 1",
      [sessionData.user.id],
    );
    callerProfile = rows[0] ?? null;
  } catch (err) {
    console.error("updateStudentInfo: failed to verify caller profile:", err);
    callerProfile = null;
  }

  if (!callerProfile || !callerProfile.is_active) {
    return { success: false, error: "Could not verify your account." };
  }
  if (!["admin", "super_admin"].includes(callerProfile.role)) {
    return { success: false, error: "Only admins can edit student records." };
  }

  // ---- 2. Validate input ----
  const errors: string[] = [];
  const studentId = trimmed(input.studentId);
  const surname = trimmed(input.surname);
  const firstName = trimmed(input.firstName);
  const sex = input.sex === "Male" || input.sex === "Female" ? input.sex : null;

  if (!studentId || !/^[0-9a-f-]{36}$/i.test(studentId)) errors.push("Invalid student id.");
  if (!surname) errors.push("Surname is required.");
  if (!firstName) errors.push("First name is required.");

  // date_of_birth must be a real ISO date or empty
  const dateOfBirth = trimmed(input.dateOfBirth);
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    errors.push("Date of birth must be a valid date (YYYY-MM-DD).");
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(" ") };
  }

  // ---- 3. Verify the student exists ----
  const existing = await queryPostgres<{ id: string }>(
    "select id from students where id = $1 limit 1",
    [studentId],
  );
  if (existing.length === 0) {
    return { success: false, error: "Student not found." };
  }

  // ---- 4. Resolve province/city names to lookup ids (case-insensitive) ----
  const province = trimmed(input.province);
  const city = trimmed(input.city);

  let provinceId: string | null = null;
  if (province) {
    const rows = await queryPostgres<{ id: string }>(
      "select id from lookup_provinces where lower(name) = lower($1) limit 1",
      [province],
    );
    provinceId = rows[0]?.id ?? null;
    if (!provinceId) {
      return { success: false, error: `Unknown province: ${province}` };
    }
  }

  let cityId: string | null = null;
  if (city) {
    const rows = await queryPostgres<{ id: string }>(
      `select id from lookup_cities
       where lower(name) = lower($1) and ($2::uuid is null or province_id = $2)
       limit 1`,
      [city, provinceId],
    );
    cityId = rows[0]?.id ?? null;
    if (!cityId) {
      return { success: false, error: `Unknown city: ${city}` };
    }
  }
  // ---- 5. Update the permanent student row ----
  await queryPostgres(
    `update students set
       surname = $2,
       first_name = $3,
       middle_initial = $4,
       sex = $5,
       date_of_birth = $6,
       province_id = $7,
       city_id = $8,
       barangay = $9,
       sitio_phase = $10,
       complete_address = $11,
       updated_at = now()
     where id = $1`,
    [
      studentId,
      surname,
      firstName,
      trimmed(input.middleInitial),
      sex,
      dateOfBirth,
      provinceId,
      cityId,
      trimmed(input.barangay),
      trimmed(input.sitioPhase),
      trimmed(input.completeAddress),
    ],
  );

  // ---- 6. Update the student's LATEST enrollment record (if any) ----
  await queryPostgres(
    `update enrollment_records set
       school_name = $2,
       course_in_college = $3,
       education_status = $4,
       location_for_reporting = $5,
       remarks = $6
     where id = (
       select id from enrollment_records
       where student_id = $1
       order by school_year desc
       limit 1
     )`,
    [
      studentId,
      trimmed(input.schoolName),
      trimmed(input.courseInCollege),
      trimmed(input.educationStatus),
      trimmed(input.locationForReporting),
      trimmed(input.remarks),
    ],
  );

  // ---- 7. Refresh the directory so the table shows the new data ----
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}/edit`);

  return { success: true };
}
