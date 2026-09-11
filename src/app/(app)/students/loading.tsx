import { TableSkeleton } from "@/components/loading";

/** Centered loading state while the students registry streams in. */
export default function Loading() {
  return (
    <div className="flex h-full w-full flex-col gap-4 bg-slate-100 p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Directory header placeholder */}
        <div className="flex shrink-0 items-center justify-between border-b border-emerald-100 bg-white px-5 py-3">
          <span aria-hidden="true" className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
          <span aria-hidden="true" className="h-8 w-36 animate-pulse rounded-lg bg-emerald-50" />
        </div>

        {/* Filters strip placeholder */}
        <div className="flex shrink-0 gap-2.5 border-b border-emerald-100 bg-white px-5 py-2.5">
          <span aria-hidden="true" className="h-8 w-full max-w-xs animate-pulse rounded-lg bg-slate-100" />
          <span aria-hidden="true" className="hidden h-8 w-32 animate-pulse rounded-lg bg-slate-100 sm:block" />
          <span aria-hidden="true" className="hidden h-8 w-32 animate-pulse rounded-lg bg-slate-100 sm:block" />
          <span aria-hidden="true" className="hidden h-8 w-32 animate-pulse rounded-lg bg-slate-100 sm:block" />
        </div>

        <TableSkeleton label="Loading students..." />
      </div>
    </div>
  );
}
