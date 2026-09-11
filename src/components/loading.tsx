/* Reusable loading primitives shared by every route segment.
 * Server-component safe (no hooks): usable inside loading.tsx files,
 * <Suspense> fallbacks, or anywhere else in the tree. */

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}

export function LoadingSpinner({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center gap-2.5 ${className}`}>
      <svg className="h-5 w-5 shrink-0 animate-spin text-emerald-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-20" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span className="text-xs font-medium text-slate-500">{label}</span> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

/** Full content-area loading state: spinner centered in the middle of the page. */
export function PageLoading({
  label = "Loading...",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex min-h-[240px] flex-1 items-center justify-center ${className}`}>
      <LoadingSpinner label={label} />
    </div>
  );
}

/**
 * Skeleton shaped like the students registry table: emerald header strip,
 * pinned avatar + name + code + edit cells on the left, data columns to the
 * right, and the footer pagination strip.
 */
export function TableSkeleton({
  label = "Loading students...",
  rows = 12,
  columns = 9,
}: {
  label?: string;
  rows?: number;
  columns?: number;
}) {
  return (
    <div role="status" aria-busy="true" className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex h-9 shrink-0 items-center gap-3 bg-emerald-600 px-3">
        <Skeleton className="h-3 w-20 bg-emerald-300/50" />
        <Skeleton className="h-3 w-28 bg-emerald-300/50" />
        <Skeleton className="hidden h-3 w-14 bg-emerald-300/50 sm:block" />
        <Skeleton className="ml-auto h-3 w-10 bg-emerald-300/50" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex h-9 items-center gap-3 border-b border-slate-100 px-3">
            <span aria-hidden="true" className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-emerald-100" />
            <Skeleton className="h-3 w-28 shrink-0" />
            <Skeleton className="hidden h-3 w-16 shrink-0 sm:block" />
            <span aria-hidden="true" className="h-5 w-9 shrink-0 animate-pulse rounded bg-emerald-50" />
            <span className="flex min-w-0 flex-1 gap-3 overflow-hidden">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-3 w-20 shrink-0" />
              ))}
            </span>
          </div>
        ))}
      </div>

      <div className="flex h-11 shrink-0 items-center justify-between border-t border-emerald-100 bg-white px-5">
        <Skeleton className="h-3 w-44" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-7 w-20 bg-emerald-100" />
          <Skeleton className="h-7 w-14" />
        </div>
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}

function StatCardSkeleton({ solid = false }: { solid?: boolean }) {
  return (
    <div
      className={`flex min-h-[92px] flex-col justify-between rounded-xl px-4 py-3.5 ${
        solid ? "bg-emerald-600" : "border border-emerald-100 bg-emerald-50/70"
      }`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className={`h-2.5 w-24 ${solid ? "bg-emerald-300/50" : "bg-emerald-200/70"}`} />
        <Skeleton className={`h-5 w-5 rounded-full ${solid ? "bg-emerald-300/50" : "bg-emerald-200/70"}`} />
      </div>
      <Skeleton className={`h-5 w-16 ${solid ? "bg-emerald-200/70" : "bg-emerald-200"}`} />
    </div>
  );
}

function ChartCardSkeleton({ bars = 7 }: { bars?: number }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-1.5 h-2.5 w-52" />
        </div>
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500/40" aria-hidden="true" />
      </div>
      <div className="flex h-[200px] items-end gap-3 pb-1">
        {Array.from({ length: bars }).map((_, i) => (
          <Skeleton key={i} className="h-full flex-1" />
        ))}
      </div>
    </section>
  );
}

/** Full dashboard placeholder: topbar, stat cards, charts, submissions table. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-64" />
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardSkeleton solid />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCardSkeleton />
        </div>
        <ChartCardSkeleton bars={5} />
      </div>
      <div className="grid items-stretch gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCardSkeleton bars={6} />
        </div>
        <ChartCardSkeleton bars={5} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="mt-1.5 h-2.5 w-56" />
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="ml-auto h-3 w-12" />
            </div>
          ))}
        </div>
      </section>
      <span className="sr-only">Loading dashboard...</span>
    </div>
  );
}

/** Placeholder for the admin accounts workspace. */
export function AccountsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading accounts">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-2.5 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3.5">
            <span aria-hidden="true" className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="hidden h-3 w-48 sm:block" />
            <Skeleton className="ml-auto h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading accounts...</span>
    </div>
  );
}
