"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type StudentFiltersProps = {
  gradeLevels: string[];
  schoolYears: string[];
  statuses: string[];
};

export function StudentFilters({ gradeLevels, schoolYears, statuses }: StudentFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentGrade = searchParams.get("grade") ?? "";
  const currentYear = searchParams.get("year") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const hasActiveFilters = Boolean(
    searchParams.get("search") || currentGrade || currentYear || currentStatus,
  );

  // Push a fresh URL with the given overrides applied on top of current
  // filters, always resetting to page 1 since the result set changed.
  function updateFilters(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");

    startTransition(() => {
      router.push(`/students?${params.toString()}`);
    });
  }

  // Debounce the free-text search so it doesn't navigate on every keystroke.
  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateFilters({ search: value });
    }, 350);
  }

  // Keep the input in sync if the URL changes some other way (e.g. Clear filters link).
  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
      <label className="relative block min-w-0 flex-1 lg:max-w-sm">
        <span className="sr-only">Search students</span>
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Search by name or child code"
        />
      </label>

      <select
        value={currentGrade}
        onChange={(e) => updateFilters({ grade: e.target.value })}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">All grades</option>
        {gradeLevels.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      <select
        value={currentYear}
        onChange={(e) => updateFilters({ year: e.target.value })}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">All school years</option>
        {schoolYears.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <select
        value={currentStatus}
        onChange={(e) => updateFilters({ status: e.target.value })}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">All statuses</option>
        {statuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => updateFilters({ search: "", grade: "", year: "", status: "" })}
          className="h-9 flex items-center rounded-lg px-3 text-xs font-semibold text-slate-400 transition hover:text-slate-600"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}