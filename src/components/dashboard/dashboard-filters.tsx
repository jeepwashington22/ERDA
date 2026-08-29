"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Props = {
  provinceOptions: { id: string; name: string }[];
  schoolYearOptions: string[];
};

// Compact, inline version meant to live inside the dashboard top bar
// (previously a full-width card — now just two small selects).
export function DashboardFilters({ provinceOptions, schoolYearOptions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectClass =
    "h-8 rounded-lg border border-emerald-200 bg-white pl-2.5 pr-7 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

  return (
    <div className="flex items-center gap-2">
      <select
        className={selectClass}
        defaultValue={searchParams.get("provinceId") ?? ""}
        onChange={(e) => updateParam("provinceId", e.target.value)}
        aria-label="Filter by province"
      >
        <option value="">All provinces</option>
        {provinceOptions.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select
        className={selectClass}
        defaultValue={searchParams.get("schoolYear") ?? ""}
        onChange={(e) => updateParam("schoolYear", e.target.value)}
        aria-label="Filter by school year"
      >
        <option value="">All school years</option>
        {schoolYearOptions.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}