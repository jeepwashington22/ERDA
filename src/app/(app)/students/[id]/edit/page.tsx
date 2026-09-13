import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getStudentForEdit,
  getLocationOptions,
} from "@/server/services/student-registry";
import { EditStudentForm } from "./EditStudentForm";

export const metadata = { title: "Edit Student | Erda Scholar System" };

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [student, locationOptions] = await Promise.all([
    getStudentForEdit(id),
    getLocationOptions(),
  ]);

  if (!student) notFound();

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-slate-100 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Edit Student</h2>
            <p className="text-xs text-slate-500">
              {student.childCode}
              {student.latestSchoolYear ? ` · latest record ${student.latestSchoolYear}` : ""}
            </p>
          </div>
          <Link
            href="/students"
            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-emerald-50"
          >
            Back to directory
          </Link>
        </div>

        <EditStudentForm
          student={student}
          provinces={locationOptions.provinces}
          citiesByProvince={locationOptions.citiesByProvince}
        />
      </div>
    </div>
  );
}
