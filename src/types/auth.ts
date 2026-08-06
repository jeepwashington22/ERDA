export const authRoles = ["super_admin", "admin", "staff"] as const;

export type AuthRole = (typeof authRoles)[number];

const roleLabels: Record<AuthRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
};

export function isAuthRole(value: string | null | undefined): value is AuthRole {
  return Boolean(value && authRoles.includes(value.toLowerCase() as AuthRole));
}

export function normalizeAuthRole(value: string | null | undefined): AuthRole {
  const normalized = value?.toLowerCase();

  return isAuthRole(normalized) ? normalized : "staff";
}

export function getAuthRoleLabel(role: AuthRole): string {
  return roleLabels[role];
}
