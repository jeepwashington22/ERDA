import { AccountsSkeleton } from "@/components/loading";

/** Shown while the accounts list is fetched. */
export default function Loading() {
  return (
    <div className="p-4 sm:p-6">
      <AccountsSkeleton />
    </div>
  );
}
