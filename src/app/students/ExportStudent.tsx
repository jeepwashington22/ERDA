"use client";

import { useState } from "react";

type Props = {
  gradeLevels: string[];
  schoolYears: string[];
  statuses: string[];
};

export function ExportStudentsButton({ gradeLevels, schoolYears, statuses }: Props) {
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (grade) params.set("grade", grade);
      if (year) params.set("year", year);
      if (status) params.set("status", status);

      const res = await fetch(`/api/students/export?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Export failed. Please try again.");
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? "students-export.xlsx";

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsExporting(false);
    }
  }

  const selectClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        <span aria-hidden="true">⭳</span>
        Export to Excel
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_90px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Export</p>
                <h2 id="export-modal-title" className="mt-1 text-xl font-semibold text-slate-950">
                  Export student records
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose filters to scope the exported file — matches the original SY intake format.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                School year
                <select className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">All school years</option>
                  {schoolYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <span className="block text-xs font-normal text-slate-400">
                  Picking a year names the file after it (e.g. SY_2023-2024.xlsx), matching your intake sheets.
                </span>
              </label>

              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                Grade level
                <select className={selectClass} value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="">All grades</option>
                  {gradeLevels.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                Education status
                <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {isExporting ? "Exporting..." : "Export file"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}