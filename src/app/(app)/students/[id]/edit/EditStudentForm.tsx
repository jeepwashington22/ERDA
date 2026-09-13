"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStudentInfo } from "@/server/actions/update-student";
import type { StudentEditRow } from "@/server/services/student-registry";

type Props = {
  student: StudentEditRow;
  provinces: string[];
  citiesByProvince: Record<string, string[]>;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function EditStudentForm({ student, provinces, citiesByProvince }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Controlled state so the city dropdown can react to the chosen province.
  const [form, setForm] = useState({
    surname: student.surname ?? "",
    firstName: student.firstName ?? "",
    middleInitial: student.middleInitial ?? "",
    sex: student.sex ?? "",
    dateOfBirth: student.dateOfBirth ?? "",
    province: student.province ?? "",
    city: student.city ?? "",
    barangay: student.barangay ?? "",
    sitioPhase: student.sitioPhase ?? "",
    completeAddress: student.completeAddress ?? "",
    schoolName: student.schoolName ?? "",
    courseInCollege: student.courseInCollege ?? "",
    educationStatus: student.educationStatus ?? "",
    locationForReporting: student.locationForReporting ?? "",
    remarks: student.remarks ?? "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const cityOptions = useMemo(
    () => (form.province ? (citiesByProvince[form.province] ?? []) : []),
    [form.province, citiesByProvince],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateStudentInfo({
        studentId: student.id,
        surname: form.surname,
        firstName: form.firstName,
        middleInitial: form.middleInitial || null,
        sex: form.sex || null,
        dateOfBirth: form.dateOfBirth || null,
        province: form.province || null,
        city: form.city || null,
        barangay: form.barangay || null,
        sitioPhase: form.sitioPhase || null,
        completeAddress: form.completeAddress || null,
        schoolName: form.schoolName || null,
        courseInCollege: form.courseInCollege || null,
        educationStatus: form.educationStatus || null,
        locationForReporting: form.locationForReporting || null,
        remarks: form.remarks || null,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/students");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Identity */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-950">Personal Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Surname *">
            <input className={inputCls} value={form.surname} onChange={(e) => set("surname", e.target.value)} required />
          </Field>
          <Field label="First Name *">
            <input className={inputCls} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
          </Field>
          <Field label="Middle Initial">
            <input className={inputCls} maxLength={2} value={form.middleInitial} onChange={(e) => set("middleInitial", e.target.value)} />
          </Field>
          <Field label="Sex">
            <select className={inputCls} value={form.sex} onChange={(e) => set("sex", e.target.value)}>
              <option value="">—</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </Field>
          <Field label="Date of Birth">
            <input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Address */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-950">Address</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Province">
            <select
              className={inputCls}
              value={form.province}
              onChange={(e) => {
                set("province", e.target.value);
                set("city", "");
              }}
            >
              <option value="">—</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="City / Municipality">
            <select className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} disabled={!form.province}>
              <option value="">—</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Barangay">
            <input className={inputCls} value={form.barangay} onChange={(e) => set("barangay", e.target.value)} />
          </Field>
          <Field label="Sitio / Phase">
            <input className={inputCls} value={form.sitioPhase} onChange={(e) => set("sitioPhase", e.target.value)} />
          </Field>
          <Field label="Complete Address">
            <input className={inputCls} value={form.completeAddress} onChange={(e) => set("completeAddress", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Latest enrollment */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-slate-950">
          Latest Enrollment ({student.latestSchoolYear ?? "no records"})
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Changes here apply to the student&apos;s most recent school-year record.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="School Name">
            <input className={inputCls} value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} />
          </Field>
          <Field label="Course in College">
            <input className={inputCls} value={form.courseInCollege} onChange={(e) => set("courseInCollege", e.target.value)} />
          </Field>
          <Field label="Education Status">
            <input className={inputCls} value={form.educationStatus} onChange={(e) => set("educationStatus", e.target.value)} />
          </Field>
          <Field label="Location for Reporting">
            <input className={inputCls} value={form.locationForReporting} onChange={(e) => set("locationForReporting", e.target.value)} />
          </Field>
          <Field label="Remarks">
            <input className={inputCls} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
          </Field>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/students")}
          className="rounded-lg border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
