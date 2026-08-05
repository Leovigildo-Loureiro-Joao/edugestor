export const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  teacher: 1,
  manager: 2,
  admin: 3,
} as const;

export const VALID_ROLES = ['admin', 'manager', 'teacher', 'user'] as const;

export type UserRole = (typeof VALID_ROLES)[number];

export const isValidRole = (role?: string): role is UserRole =>
  !!role && (VALID_ROLES as readonly string[]).includes(role);

export const hasPermission = (userRole: string | undefined, requiredRole: string): boolean => {
  if (!userRole) return false;
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
};
