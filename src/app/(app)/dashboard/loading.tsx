import { DashboardSkeleton } from "@/components/loading";

/** Shown while the dashboard summary queries run. */
export default function Loading() {
  return (
    <div className="p-4 sm:p-6">
      <DashboardSkeleton />
    </div>
  );
}
