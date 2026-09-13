import { queryPostgres } from "../lib/postgres";

export type StudentFullRow = {
  id: string;
  // Intake
  intakeNo: number | null;
  dateOfIntakeInterview: string | null;
  childCode: string;
  batchNumber: string | null;
  // Location
  province: string | null;
  city: string | null;
  barangay: string | null;
  sitioPhase: string | null;
  completeAddress: string | null;
  // Identity
  surname: string | null;
  firstName: string | null;
  middleInitial: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  age: number | null;
  // Academic placement
  gradeLevel: string | null;
  shsTrack: string | null;
  courseInCollege: string | null;
  schoolName: string | null;
  classification: string | null;
  dropoutReason: string | null;
  dropoutReasonOther: string | null;
  cnspCluster: string | null;
  educationStatus: string | null;
  // Household
  hhHeadSurname: string | null;
  hhHeadFirstName: string | null;
  hhHeadSurnameMother: string | null; // not in schema yet — always null
  hhHeadFirstNameMother: string | null; // not in schema yet — always null
  occupationOfHhHead: string | null;
  familyPerCapitaIncome: string | null;
  // Housing
  houseOwnership: string | null;
  houseOwnershipOther: string | null;
  sizeOfDwelling: string | null;
  materials: string | null;
  materialsOther: string | null;
  waterSupply: string | null;
  waterSupplyOther: string | null;
  lightingFacility: string | null;
  lightingFacilityOther: string | null;
  toiletFacility: string | null;
  toiletFacilityOther: string | null;
  furnitures: string | null;
  // Welfare
  presentlyServedByWelfareAgency: boolean | null;
  welfareAgencyName: string | null;
  typeOfServiceAvailed: string | null;
  isOrganizationMember: boolean | null;
  organizationType: string | null;
  socialProtectionProgram: string | null;
  socialProtectionOther: string | null;
  educationScheme: string | null;
  tieUpPartnerName: string | null;
  staffInCharge: string | null;
  funderName: string | null;
  // Reporting
  locationForReporting: string | null;
  remarks: string | null;
  latestSchoolYear: string | null;
};

export type StudentRegistryFilters = {
  search?: string;
  grade?: string;
  year?: string;
  status?: string;
};

const BASE_FROM = `
  from students s
  left join lookup_provinces lp on lp.id = s.province_id
  left join lookup_cities lc on lc.id = s.city_id
  left join lateral (
    select er.*
    from enrollment_records er
    where er.student_id = s.id
      -- YEAR-AWARE MONITORING: when a school-year filter is active, join THAT
      -- year's enrollment snapshot instead of only the latest one. Without a
      -- year filter this falls back to the student's most recent record.
      and ($3::text is null or er.school_year = $3)
    order by er.school_year desc
    limit 1
  ) er on true
  left join lookup_grade_levels gl on gl.id = er.grade_level_id
  left join lookup_shs_tracks st on st.id = er.shs_track_id
  left join lookup_classifications cl on cl.id = er.classification_id
  left join lookup_cnsp_clusters cc on cc.id = er.cnsp_cluster_id
  left join household_snapshots hs on hs.enrollment_record_id = er.id
  left join lookup_income_brackets ib on ib.id = hs.income_bracket_id
  left join housing_conditions hc on hc.enrollment_record_id = er.id
  left join lookup_house_ownership_types ho on ho.id = hc.house_ownership_id
  left join lookup_dwelling_materials dm on dm.id = hc.materials_id
  left join lookup_water_supply_types ws on ws.id = hc.water_supply_id
  left join lookup_lighting_facility_types lf on lf.id = hc.lighting_facility_id
  left join lookup_toilet_facility_types tf on tf.id = hc.toilet_facility_id
  left join welfare_services wf on wf.enrollment_record_id = er.id
  left join lookup_education_schemes es on es.id = wf.education_scheme_id
`;

const WHERE_CLAUSE = `
  where
    ($1::text is null or (
      s.child_code ilike '%' || $1 || '%'
      or s.surname ilike '%' || $1 || '%'
      or s.first_name ilike '%' || $1 || '%'
    ))
    and ($2::text is null or gl.name = $2)
    and ($3::text is null or er.school_year = $3)
    and ($4::text is null or er.education_status = $4)
`;

export async function getStudentRegistryRows(
  filters: StudentRegistryFilters = {},
  page = 1,
  pageSize = 25,
): Promise<{ rows: StudentFullRow[]; totalCount: number }> {
  const { search, grade, year, status } = filters;
  const params = [search || null, grade || null, year || null, status || null];
  const offset = (page - 1) * pageSize;

  const [rows, countRows] = await Promise.all([
    queryPostgres<any>(
      `select
         s.id,
         er.intake_no,
         er.date_of_intake_interview::text as date_of_intake_interview,
         s.child_code,
         er.batch_number,
         lp.name as province,
         lc.name as city,
         s.barangay,
         s.sitio_phase,
         s.complete_address,
         s.surname,
         s.first_name,
         s.middle_initial,
         s.sex,
         s.date_of_birth::text as date_of_birth,
         extract(year from age(s.date_of_birth))::int as age,
         gl.name as grade_level,
         st.name as shs_track,
         er.course_in_college,
         er.school_name,
         cl.name as classification,
         er.dropout_reason,
         er.dropout_reason_other,
         cc.name as cnsp_cluster,
         er.education_status,
         hs.hh_head_surname,
         hs.hh_head_first_name,
         null::text as hh_head_surname_mother,
         null::text as hh_head_first_name_mother,
         hs.occupation_of_hh_head,
         ib.label as family_per_capita_income,
         ho.name as house_ownership,
         hc.house_ownership_other,
         hc.size_of_dwelling,
         dm.name as materials,
         hc.materials_other,
         ws.name as water_supply,
         hc.water_supply_other,
         lf.name as lighting_facility,
         hc.lighting_facility_other,
         tf.name as toilet_facility,
         hc.toilet_facility_other,
         hc.furnitures,
         wf.presently_served_by_welfare_agency,
         wf.welfare_agency_name,
         wf.type_of_service_availed,
         wf.is_organization_member,
         wf.organization_type,
         wf.social_protection_program,
         wf.social_protection_other,
         es.name as education_scheme,
         wf.tie_up_partner_name,
         wf.staff_in_charge,
         wf.funder_name,
         er.location_for_reporting,
         er.remarks,
         er.school_year as latest_school_year
       ${BASE_FROM}
       ${WHERE_CLAUSE}
       order by s.surname, s.first_name
       limit $5 offset $6`,
      [...params, pageSize, offset],
    ),
    queryPostgres<{ count: string }>(
      `select count(*)::text as count ${BASE_FROM} ${WHERE_CLAUSE}`,
      params,
    ),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      intakeNo: r.intake_no,
      dateOfIntakeInterview: r.date_of_intake_interview,
      childCode: r.child_code,
      batchNumber: r.batch_number,
      province: r.province,
      city: r.city,
      barangay: r.barangay,
      sitioPhase: r.sitio_phase,
      completeAddress: r.complete_address,
      surname: r.surname,
      firstName: r.first_name,
      middleInitial: r.middle_initial,
      sex: r.sex,
      dateOfBirth: r.date_of_birth,
      age: r.age,
      gradeLevel: r.grade_level,
      shsTrack: r.shs_track,
      courseInCollege: r.course_in_college,
      schoolName: r.school_name,
      classification: r.classification,
      dropoutReason: r.dropout_reason,
      dropoutReasonOther: r.dropout_reason_other,
      cnspCluster: r.cnsp_cluster,
      educationStatus: r.education_status,
      hhHeadSurname: r.hh_head_surname,
      hhHeadFirstName: r.hh_head_first_name,
      hhHeadSurnameMother: r.hh_head_surname_mother,
      hhHeadFirstNameMother: r.hh_head_first_name_mother,
      occupationOfHhHead: r.occupation_of_hh_head,
      familyPerCapitaIncome: r.family_per_capita_income,
      houseOwnership: r.house_ownership,
      houseOwnershipOther: r.house_ownership_other,
      sizeOfDwelling: r.size_of_dwelling,
      materials: r.materials,
      materialsOther: r.materials_other,
      waterSupply: r.water_supply,
      waterSupplyOther: r.water_supply_other,
      lightingFacility: r.lighting_facility,
      lightingFacilityOther: r.lighting_facility_other,
      toiletFacility: r.toilet_facility,
      toiletFacilityOther: r.toilet_facility_other,
      furnitures: r.furnitures,
      presentlyServedByWelfareAgency: r.presently_served_by_welfare_agency,
      welfareAgencyName: r.welfare_agency_name,
      typeOfServiceAvailed: r.type_of_service_availed,
      isOrganizationMember: r.is_organization_member,
      organizationType: r.organization_type,
      socialProtectionProgram: r.social_protection_program,
      socialProtectionOther: r.social_protection_other,
      educationScheme: r.education_scheme,
      tieUpPartnerName: r.tie_up_partner_name,
      staffInCharge: r.staff_in_charge,
      funderName: r.funder_name,
      locationForReporting: r.location_for_reporting,
      remarks: r.remarks,
      latestSchoolYear: r.latest_school_year,
    })),
    totalCount: Number(countRows[0]?.count ?? 0),
  };
}

export async function getStudentFilterOptions() {
  const [gradeRows, yearRows, statusRows] = await Promise.all([
    queryPostgres<{ name: string }>(
      "select distinct name from lookup_grade_levels where name is not null order by name asc",
    ),
    queryPostgres<{ school_year: string }>(
      "select distinct school_year from enrollment_records where school_year is not null order by school_year desc",
    ),
    queryPostgres<{ education_status: string }>(
      "select distinct education_status from enrollment_records where education_status is not null order by education_status asc",
    ),
  ]);

  return {
    gradeLevels: gradeRows.map((r) => r.name),
    schoolYears: yearRows.map((r) => r.school_year),
    statuses: statusRows.map((r) => r.education_status),
  };
}
// ============================================================================
// EDIT SUPPORT — fetch one student's editable fields + lookup options
// ============================================================================

export type StudentEditRow = {
  id: string;
  childCode: string;
  surname: string;
  firstName: string;
  middleInitial: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
  sitioPhase: string | null;
  completeAddress: string | null;
  // latest enrollment fields
  schoolName: string | null;
  courseInCollege: string | null;
  educationStatus: string | null;
  locationForReporting: string | null;
  remarks: string | null;
  latestSchoolYear: string | null;
};

/** Loads the editable subset of a student's permanent identity + latest enrollment. */
export async function getStudentForEdit(studentId: string): Promise<StudentEditRow | null> {
  const rows = await queryPostgres<any>(
    `select
       s.id,
       s.child_code,
       s.surname,
       s.first_name,
       s.middle_initial,
       s.sex,
       s.date_of_birth::text as date_of_birth,
       lp.name as province,
       lc.name as city,
       s.barangay,
       s.sitio_phase,
       s.complete_address,
       er.school_name,
       er.course_in_college,
       er.education_status,
       er.location_for_reporting,
       er.remarks,
       er.school_year as latest_school_year
     from students s
     left join lookup_provinces lp on lp.id = s.province_id
     left join lookup_cities lc on lc.id = s.city_id
     left join lateral (
       select er.*
       from enrollment_records er
       where er.student_id = s.id
       order by er.school_year desc
       limit 1
     ) er on true
     where s.id = $1
     limit 1`,
    [studentId],
  );

  const r = rows[0];
  if (!r) return null;

  return {
    id: r.id,
    childCode: r.child_code,
    surname: r.surname,
    firstName: r.first_name,
    middleInitial: r.middle_initial,
    sex: r.sex,
    dateOfBirth: r.date_of_birth,
    province: r.province,
    city: r.city,
    barangay: r.barangay,
    sitioPhase: r.sitio_phase,
    completeAddress: r.complete_address,
    schoolName: r.school_name,
    courseInCollege: r.course_in_college,
    educationStatus: r.education_status,
    locationForReporting: r.location_for_reporting,
    remarks: r.remarks,
    latestSchoolYear: r.latest_school_year,
  };
}

/** Province + city lists for the address dropdowns on the edit form. */
export async function getLocationOptions() {
  const [provinceRows, cityRows] = await Promise.all([
    queryPostgres<{ name: string }>("select name from lookup_provinces order by name asc"),
    queryPostgres<{ province: string; name: string }>(
      `select lp.name as province, lc.name as name
       from lookup_cities lc
       join lookup_provinces lp on lp.id = lc.province_id
       order by lp.name asc, lc.name asc`,
    ),
  ]);

  return {
    provinces: provinceRows.map((r) => r.name),
    citiesByProvince: cityRows.reduce<Record<string, string[]>>((acc, r) => {
      (acc[r.province] ??= []).push(r.name);
      return acc;
    }, {}),
  };
}

export async function getStudentsForExport(
  filters: StudentRegistryFilters,
): Promise<StudentFullRow[]> {
  const { search, grade, year, status } = filters;
  const params = [search || null, grade || null, year || null, status || null];

  const rows = await queryPostgres<any>(
    `select
       s.id,
       er.intake_no,
       er.date_of_intake_interview::text as date_of_intake_interview,
       s.child_code,
       er.batch_number,
       lp.name as province,
       lc.name as city,
       s.barangay,
       s.sitio_phase,
       s.complete_address,
       s.surname,
       s.first_name,
       s.middle_initial,
       s.sex,
       s.date_of_birth::text as date_of_birth,
       extract(year from age(s.date_of_birth))::int as age,
       gl.name as grade_level,
       st.name as shs_track,
       er.course_in_college,
       er.school_name,
       cl.name as classification,
       er.dropout_reason,
       er.dropout_reason_other,
       cc.name as cnsp_cluster,
       er.education_status,
       hs.hh_head_surname,
       hs.hh_head_first_name,
       null::text as hh_head_surname_mother,
       null::text as hh_head_first_name_mother,
       hs.occupation_of_hh_head,
       ib.label as family_per_capita_income,
       ho.name as house_ownership,
       hc.house_ownership_other,
       hc.size_of_dwelling,
       dm.name as materials,
       hc.materials_other,
       ws.name as water_supply,
       hc.water_supply_other,
       lf.name as lighting_facility,
       hc.lighting_facility_other,
       tf.name as toilet_facility,
       hc.toilet_facility_other,
       hc.furnitures,
       wf.presently_served_by_welfare_agency,
       wf.welfare_agency_name,
       wf.type_of_service_availed,
       wf.is_organization_member,
       wf.organization_type,
       wf.social_protection_program,
       wf.social_protection_other,
       es.name as education_scheme,
       wf.tie_up_partner_name,
       wf.staff_in_charge,
       wf.funder_name,
       er.location_for_reporting,
       er.remarks,
       er.school_year as latest_school_year
     ${BASE_FROM}
     ${WHERE_CLAUSE}
     order by s.surname, s.first_name`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    intakeNo: r.intake_no,
    dateOfIntakeInterview: r.date_of_intake_interview,
    childCode: r.child_code,
    batchNumber: r.batch_number,
    province: r.province,
    city: r.city,
    barangay: r.barangay,
    sitioPhase: r.sitio_phase,
    completeAddress: r.complete_address,
    surname: r.surname,
    firstName: r.first_name,
    middleInitial: r.middle_initial,
    sex: r.sex,
    dateOfBirth: r.date_of_birth,
    age: r.age,
    gradeLevel: r.grade_level,
    shsTrack: r.shs_track,
    courseInCollege: r.course_in_college,
    schoolName: r.school_name,
    classification: r.classification,
    dropoutReason: r.dropout_reason,
    dropoutReasonOther: r.dropout_reason_other,
    cnspCluster: r.cnsp_cluster,
    educationStatus: r.education_status,
    hhHeadSurname: r.hh_head_surname,
    hhHeadFirstName: r.hh_head_first_name,
    hhHeadSurnameMother: r.hh_head_surname_mother,
    hhHeadFirstNameMother: r.hh_head_first_name_mother,
    occupationOfHhHead: r.occupation_of_hh_head,
    familyPerCapitaIncome: r.family_per_capita_income,
    houseOwnership: r.house_ownership,
    houseOwnershipOther: r.house_ownership_other,
    sizeOfDwelling: r.size_of_dwelling,
    materials: r.materials,
    materialsOther: r.materials_other,
    waterSupply: r.water_supply,
    waterSupplyOther: r.water_supply_other,
    lightingFacility: r.lighting_facility,
    lightingFacilityOther: r.lighting_facility_other,
    toiletFacility: r.toilet_facility,
    toiletFacilityOther: r.toilet_facility_other,
    furnitures: r.furnitures,
    presentlyServedByWelfareAgency: r.presently_served_by_welfare_agency,
    welfareAgencyName: r.welfare_agency_name,
    typeOfServiceAvailed: r.type_of_service_availed,
    isOrganizationMember: r.is_organization_member,
    organizationType: r.organization_type,
    socialProtectionProgram: r.social_protection_program,
    socialProtectionOther: r.social_protection_other,
    educationScheme: r.education_scheme,
    tieUpPartnerName: r.tie_up_partner_name,
    staffInCharge: r.staff_in_charge,
    funderName: r.funder_name,
    locationForReporting: r.location_for_reporting,
    remarks: r.remarks,
    latestSchoolYear: r.latest_school_year,
  }));
}