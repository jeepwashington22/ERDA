"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Props = {
  provinceOptions: { id: string; name: string }[];
  schoolYearOptions: string[];
};

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
    "h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Filter</span>

      <select
        className={selectClass}
        defaultValue={searchParams.get("provinceId") ?? ""}
        onChange={(e) => updateParam("provinceId", e.target.value)}
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
      >
        <option value="">All school years</option>
        {schoolYearOptions.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}