import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/current-user";

/**
 * Shared shell for every authenticated segment (dashboard, students, admin).
 * The AppShell lives in a layout so that:
 *  - the sidebar/topbar stay mounted across client navigations (no flash),
 *  - per-segment loading.tsx skeletons render INSIDE the shell, centered in
 *    the content area while data streams in,
 *  - auth + profile resolution happens once per request, not per page.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();

  return (
    <AppShell
      userRole={user.role ?? undefined}
      userName={user.fullName ?? undefined}
      userEmail={user.email}
    >
      {children}
    </AppShell>
  );
}
