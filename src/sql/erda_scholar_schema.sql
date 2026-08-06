-- ============================================================================
-- ERDA SCHOLAR SYSTEM — DATABASE SCHEMA
-- Source: SY intake spreadsheets (e.g. SY_2017-18.xlsx, SY 2025-26.xlsx)
-- Target: Supabase (PostgreSQL)
--
-- DESIGN SUMMARY
-- ----------------------------------------------------------------------------
-- 1. students            -> permanent identity, one row per child, forever
-- 2. enrollment_records   -> one row per student PER SCHOOL YEAR (the "batch")
-- 3. household_snapshots  -> household info, tied to a specific enrollment
-- 4. housing_conditions   -> dwelling details, tied to a specific enrollment
-- 5. welfare_services     -> agency / social protection, per enrollment
-- 6. academic_performance -> grades & assessments, per enrollment
--    (has a trigger that auto-fills the PREVIOUS year's grade on insert)
-- 7. assistance_records   -> 1-to-many: a child can receive several types
--                            of assistance within one school year
-- 8. lookup_* tables      -> every repeated category from the "reference"
--                            sheet (Province, Classification, Materials, etc.)
--
-- Every table has a UUID surrogate primary key (id). Child Code is kept as
-- the human-readable unique business key on `students`.
-- ============================================================================

-- Supabase already has pgcrypto enabled, but this is safe to run again.
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. LOOKUP / REFERENCE TABLES
--    These mirror the dropdown lists in your Excel "reference" sheet.
--    Populate these first — everything else points to them.
-- ============================================================================

create table lookup_provinces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table lookup_cities (
  id uuid primary key default gen_random_uuid(),
  province_id uuid references lookup_provinces(id),
  name text not null,
  unique (province_id, name)
);

create table lookup_grade_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,      -- 'Grade 3', '1st Year College', 'ALS', etc.
  sort_order int                  -- lets you ORDER BY grade progression
);

create table lookup_classifications (
  id uuid primary key default gen_random_uuid(),
  name text not null unique       -- 'At Risk of Dropping Out', 'Dropped', 'Late Enrollee'...
);

create table lookup_cnsp_clusters (
  id uuid primary key default gen_random_uuid(),
  name text not null unique       -- 'Urban and Rural Poor Children', 'Street Children'...
);

create table lookup_shs_tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique       -- 'Academic', 'Technical Vocational and Livelihood'...
);

create table lookup_education_schemes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique       -- 'Direct', 'Tie-Up', 'Social Protection Affiliated'
);

create table lookup_house_ownership_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique       -- 'Own house and lot', 'Pays rent'...
);

create table lookup_dwelling_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique       -- 'Concrete', 'Light (Nipa, sawali etc.)'...
);

create table lookup_water_supply_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table lookup_lighting_facility_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table lookup_toilet_facility_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table lookup_income_brackets (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,     -- 'Php 1,000- 1,099', 'Php 1,500 above'...
  sort_order int
);

-- ============================================================================
-- 2. STUDENTS — permanent identity, does not repeat across school years
-- ============================================================================

create table students (
  id uuid primary key default gen_random_uuid(),
  child_code text not null unique,     -- e.g. 'NCR_CALO_Y10001_AK' — natural unique ID
  surname text not null,
  first_name text not null,
  middle_initial text,
  sex text check (sex in ('Male', 'Female')),
  date_of_birth date,
  province_id uuid references lookup_provinces(id),
  city_id uuid references lookup_cities(id),
  barangay text,
  sitio_phase text,
  complete_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_students_child_code on students(child_code);
create index idx_students_name on students(surname, first_name);

-- ============================================================================
-- 3. ENROLLMENT RECORDS — one row per student PER SCHOOL YEAR
--    This is the table that connects "SY 2017-18", "SY 2025-26" etc.
--    to the same student over time.
-- ============================================================================

create table enrollment_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  school_year text not null,               -- '2017-2018', '2025-2026'
  batch_number text,                       -- 'Y1', 'Y2' etc from source file
  intake_no int,                           -- the 'No.' column from the sheet
  date_of_intake_interview date,
  grade_level_id uuid references lookup_grade_levels(id),
  shs_track_id uuid references lookup_shs_tracks(id),
  course_in_college text,
  school_name text,
  classification_id uuid references lookup_classifications(id),
  dropout_reason text,
  dropout_reason_other text,
  cnsp_cluster_id uuid references lookup_cnsp_clusters(id),
  education_status text,                   -- 'Enrolled', 'Dropped out', 'Completed...'
  location_for_reporting text,
  remarks text,
  created_at timestamptz not null default now(),

  -- one enrollment record per student per school year, never duplicated
  unique (student_id, school_year)
);

create index idx_enrollment_student on enrollment_records(student_id);
create index idx_enrollment_school_year on enrollment_records(school_year);

-- ============================================================================
-- 4. HOUSEHOLD SNAPSHOT — household head + income, per enrollment
--    (kept per-year because occupation/income can change year to year)
-- ============================================================================

create table household_snapshots (
  id uuid primary key default gen_random_uuid(),
  enrollment_record_id uuid not null unique references enrollment_records(id) on delete cascade,
  hh_head_surname text,
  hh_head_first_name text,
  hh_head_mi text,
  occupation_of_hh_head text,
  income_bracket_id uuid references lookup_income_brackets(id),
  pci_below_800 boolean default false
);

-- ============================================================================
-- 5. HOUSING CONDITIONS — dwelling details, per enrollment
-- ============================================================================

create table housing_conditions (
  id uuid primary key default gen_random_uuid(),
  enrollment_record_id uuid not null unique references enrollment_records(id) on delete cascade,
  house_ownership_id uuid references lookup_house_ownership_types(id),
  house_ownership_other text,
  size_of_dwelling text,
  materials_id uuid references lookup_dwelling_materials(id),
  materials_other text,
  water_supply_id uuid references lookup_water_supply_types(id),
  water_supply_other text,
  lighting_facility_id uuid references lookup_lighting_facility_types(id),
  lighting_facility_other text,
  toilet_facility_id uuid references lookup_toilet_facility_types(id),
  toilet_facility_other text,
  furnitures text
);

-- ============================================================================
-- 6. WELFARE SERVICES — agency & social protection involvement, per enrollment
-- ============================================================================

create table welfare_services (
  id uuid primary key default gen_random_uuid(),
  enrollment_record_id uuid not null unique references enrollment_records(id) on delete cascade,
  presently_served_by_welfare_agency boolean default false,
  welfare_agency_name text,
  type_of_service_availed text,
  is_organization_member boolean default false,
  organization_type text,
  education_scheme_id uuid references lookup_education_schemes(id),
  social_protection_program text,
  social_protection_other text,
  tie_up_partner_name text,
  staff_in_charge text,
  funder_name text
);

-- ============================================================================
-- 7. ACADEMIC PERFORMANCE — grades & assessments, per enrollment
--    previous_general_average / previous_math_grade are AUTO-FILLED
--    by the trigger below when a new record is inserted for a student
--    who already has a prior school year on file.
-- ============================================================================

create table academic_performance (
  id uuid primary key default gen_random_uuid(),
  enrollment_record_id uuid not null unique references enrollment_records(id) on delete cascade,
  nc_coc text,
  enrolled_and_assisted_current_sy boolean,
  education_status_as_beneficiary text,
  reason_for_being_inactive text,
  graduate_remarks text,
  dropped_out_past_4_months boolean,
  dropout_reason_teacher_remarks text,
  dropout_reason_other text,
  dropout_month text,
  school_awards text,
  school_activities_attended text,
  school_org_membership text,
  capacity_building_activities text,
  math_grade_1st_period numeric(5,2),
  general_average numeric(5,2),
  reading_skills_pre_assessment text,
  reading_skills_post_assessment text,

  -- auto-filled by trigger, do not set manually on insert
  previous_general_average numeric(5,2),
  previous_math_grade_1st_period numeric(5,2),
  previous_school_year text
);

-- ----------------------------------------------------------------------------
-- TRIGGER: auto cross-check previous grade when a new academic_performance
-- row is inserted (linked via enrollment_records.student_id)
-- ----------------------------------------------------------------------------

create or replace function fill_previous_grade()
returns trigger as $$
declare
  v_student_id uuid;
  v_school_year text;
begin
  select er.student_id, er.school_year
    into v_student_id, v_school_year
  from enrollment_records er
  where er.id = new.enrollment_record_id;

  select ap.general_average, ap.math_grade_1st_period, er.school_year
    into new.previous_general_average, new.previous_math_grade_1st_period, new.previous_school_year
  from academic_performance ap
  join enrollment_records er on er.id = ap.enrollment_record_id
  where er.student_id = v_student_id
    and er.school_year < v_school_year
  order by er.school_year desc
  limit 1;

  return new;
end;
$$ language plpgsql;

create trigger trg_fill_previous_grade
before insert on academic_performance
for each row execute function fill_previous_grade();

-- ============================================================================
-- 8. ASSISTANCE RECORDS — one-to-many (a child can get several types
--    of assistance within a single school year)
-- ============================================================================

create table assistance_records (
  id uuid primary key default gen_random_uuid(),
  enrollment_record_id uuid not null references enrollment_records(id) on delete cascade,
  assistance_category text not null check (
    assistance_category in ('Educational Assistance', 'Social Protection')
  ),
  assistance_type text,           -- free-text description of what was given
  date_received date,
  visit_date date,
  remarks text
);

create index idx_assistance_enrollment on assistance_records(enrollment_record_id);

-- ============================================================================
-- 9. FORM MATCH REVIEW QUEUE
--    Any Google Forms submission that can't be matched to exactly ONE
--    student (no match, or more than one possible match) lands here
--    instead of silently updating the wrong record. An admin resolves it.
-- ============================================================================

create table form_match_review_queue (
  id uuid primary key default gen_random_uuid(),
  submitted_surname text,
  submitted_first_name text,
  submitted_middle_initial text,
  submitted_date_of_birth date,
  submitted_school_year text,
  submitted_grade_level text,
  submitted_general_average numeric(5,2),
  submitted_math_grade_1st_period numeric(5,2),
  raw_form_payload jsonb,          -- full form response, for a human to inspect
  match_status text not null default 'unresolved'
    check (match_status in ('unresolved', 'resolved', 'ignored')),
  candidate_student_ids uuid[],    -- possible matches, if more than one
  resolved_student_id uuid references students(id),
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- FUNCTION: match_and_record_grade
-- Called by the Google Apps Script trigger via Supabase RPC on every
-- form submission. Tries to match the submission to exactly one student
-- by Surname + First Name + Date of Birth.
--   - Exactly one match  -> creates/updates the enrollment_record and
--                           academic_performance row (trigger fills the
--                           previous grade automatically)
--   - Zero or 2+ matches -> logs to form_match_review_queue for a human
-- Returns a small JSON result so Apps Script knows what happened.
-- ----------------------------------------------------------------------------

create or replace function match_and_record_grade(
  p_child_code text,                 -- pass this if your form has it (best case)
  p_surname text,
  p_first_name text,
  p_middle_initial text,
  p_date_of_birth date,
  p_school_year text,
  p_grade_level text,
  p_general_average numeric,
  p_math_grade_1st_period numeric,
  p_raw_payload jsonb
) returns jsonb as $$
declare
  v_student_id uuid;
  v_match_count int;
  v_grade_level_id uuid;
  v_enrollment_id uuid;
begin
  -- 1. Best case: form carries child_code directly -> exact match, no ambiguity
  if p_child_code is not null then
    select id into v_student_id from students where child_code = p_child_code;
  end if;

  -- 2. Fallback: match by surname + first name + date of birth
  if v_student_id is null then
    select count(*), min(id) into v_match_count, v_student_id
    from students
    where lower(surname) = lower(p_surname)
      and lower(first_name) = lower(p_first_name)
      and date_of_birth = p_date_of_birth;

    if v_match_count = 0 then
      insert into form_match_review_queue (
        submitted_surname, submitted_first_name, submitted_middle_initial,
        submitted_date_of_birth, submitted_school_year, submitted_grade_level,
        submitted_general_average, submitted_math_grade_1st_period, raw_form_payload
      ) values (
        p_surname, p_first_name, p_middle_initial,
        p_date_of_birth, p_school_year, p_grade_level,
        p_general_average, p_math_grade_1st_period, p_raw_payload
      );
      return jsonb_build_object('status', 'no_match', 'action', 'sent_to_review_queue');
    elsif v_match_count > 1 then
      insert into form_match_review_queue (
        submitted_surname, submitted_first_name, submitted_middle_initial,
        submitted_date_of_birth, submitted_school_year, submitted_grade_level,
        submitted_general_average, submitted_math_grade_1st_period, raw_form_payload,
        candidate_student_ids
      )
      select p_surname, p_first_name, p_middle_initial,
             p_date_of_birth, p_school_year, p_grade_level,
             p_general_average, p_math_grade_1st_period, p_raw_payload,
             array_agg(id)
      from students
      where lower(surname) = lower(p_surname)
        and lower(first_name) = lower(p_first_name)
        and date_of_birth = p_date_of_birth;
      return jsonb_build_object('status', 'multiple_matches', 'action', 'sent_to_review_queue');
    end if;
  end if;

  -- 3. We have exactly one student -> upsert the enrollment record for this SY
  select id into v_grade_level_id from lookup_grade_levels where name = p_grade_level;

  insert into enrollment_records (student_id, school_year, grade_level_id)
  values (v_student_id, p_school_year, v_grade_level_id)
  on conflict (student_id, school_year)
  do update set grade_level_id = excluded.grade_level_id
  returning id into v_enrollment_id;

  -- 4. Insert academic performance -> trigger auto-fills previous grade
  insert into academic_performance (
    enrollment_record_id, general_average, math_grade_1st_period
  ) values (
    v_enrollment_id, p_general_average, p_math_grade_1st_period
  )
  on conflict (enrollment_record_id) do update
    set general_average = excluded.general_average,
        math_grade_1st_period = excluded.math_grade_1st_period;

  return jsonb_build_object(
    'status', 'matched',
    'student_id', v_student_id,
    'enrollment_record_id', v_enrollment_id
  );
end;
$$ language plpgsql security definer;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
-- • Import order matters: lookup_* tables first, then students, then
--   enrollment_records, then the four per-enrollment child tables.
-- • child_code is your unique identifier for matching a Google Forms
--   submission (or new SY file) back to an existing student.
-- • To "cross-check" a new grade: insert into enrollment_records for the
--   new school year, then insert into academic_performance referencing
--   that enrollment_record_id — the trigger fills in the previous
--   general_average / math_grade automatically.
-- • Every lookup table needs to be seeded once from your "reference" sheet
--   values before you import real student data (FKs will reject unknown
--   category text otherwise).
-- ============================================================================
