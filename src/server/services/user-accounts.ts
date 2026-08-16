// src/server/services/user-accounts.ts

import { queryPostgres } from "../lib/postgres";

export type UserAccountRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
  assignedCount: number;
};

export async function getUserAccounts(): Promise<UserAccountRow[]> {
  const rows = await queryPostgres<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    assigned_count: string | null;
  }>(
    `select
       up.id, up.full_name, up.email, up.role, up.is_active, up.created_at,
       sac.assigned_count
     from user_profiles up
     left join staff_assignment_counts sac on sac.staff_id = up.id
     order by up.created_at desc`
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.full_name,
    email: r.email,
    role: r.role,
    status: r.is_active ? "Active" : "Inactive",
    joined: new Date(r.created_at).toLocaleDateString(),
    assignedCount: r.assigned_count ? parseInt(r.assigned_count, 10) : 0,
  }));
}