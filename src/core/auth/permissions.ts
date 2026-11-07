import {ROLES, type Role} from "@/core/db/schema/enums";
import {ForbiddenError} from "@/core/errors/app-error";

export {ROLES, type Role};

const STAFF_ROLES = ["admin", "commandant", "management_member"] as const satisfies readonly Role[];

export const PERMISSIONS = [
  "tenant:read", "tenant:write",
  "building:read", "building:write",
  "unit:read", "unit:write",
  "owner:read", "owner:write",
  "resident:read", "resident:write",
  "voting:read", "voting:write",
  "meeting:read", "meeting:write",
  "protocol:read", "protocol:write", "protocol:sign",
  "finance:read", "finance:write",
  "charge:read", "charge:write",
  "payment:read", "payment:write",
  "fund:read", "fund:write",
  "budget:read", "budget:write",
  "contractor:read", "contractor:write",
  "work_order:read", "work_order:write",
  "ticket:read", "ticket:write",
  "document:read", "document:write",
  "announcement:read", "announcement:write",
  "notification:send",
  "audit:read", "audit:write",
  "report:read", "report:generate",
  "settings:read", "settings:write",
  "user:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  admin: PERMISSIONS,
  management_member: [
    "building:read", "unit:read", "owner:read", "resident:read",
    "voting:read", "voting:write", "meeting:read", "meeting:write",
    "protocol:read", "protocol:sign",
    "finance:read", "charge:read", "payment:read", "fund:read", "budget:read", "budget:write",
    "contractor:read", "contractor:write", "work_order:read",
    "ticket:read", "document:read", "document:write",
    "announcement:read", "announcement:write", "notification:send",
  ],
  commandant: [
    "building:read", "building:write", "unit:read", "unit:write",
    "owner:read", "resident:read",
    "ticket:read", "ticket:write", "work_order:read", "work_order:write",
    "contractor:read", "document:read",
    "announcement:read", "announcement:write",
  ],
  owner: [
    "building:read", "unit:read", "owner:read", "resident:read",
    "voting:read", "voting:write", "meeting:read", "protocol:read",
    "charge:read", "payment:read", "payment:write", "fund:read", "budget:read",
    "ticket:read", "ticket:write", "document:read", "report:read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasAnyPermission(roles: readonly Role[], permission: Permission): boolean {
  return roles.some((role) => hasPermission(role, permission));
}

export function getPermissionsForRoles(roles: readonly Role[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const perm of getPermissionsForRole(role)) set.add(perm);
  }
  return [...set];
}

function isStaffRole(role: Role): boolean {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}

export function hasStaffRole(roles: readonly Role[]): boolean {
  return roles.some(isStaffRole);
}

/** Structural session shape so client components can share the decision without the server module. */
export type SessionLike = {user: {roles: readonly Role[]}};

export function sessionAllows(session: SessionLike, permission: Permission): boolean {
  return hasAnyPermission(session.user.roles, permission);
}

/** One permission guard: pages and server actions read the same failure message. */
export function assertPermission(session: SessionLike, permission: Permission): void {
  if (!sessionAllows(session, permission)) {
    throw new ForbiddenError(`Missing permission "${permission}"`);
  }
}
