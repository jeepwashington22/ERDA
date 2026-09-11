import { PageLoading } from "@/components/loading";

/** Generic centered fallback for any (app) segment without its own loading.tsx. */
export default function Loading() {
  return <PageLoading label="Loading..." className="h-full" />;
}
