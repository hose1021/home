import {ROLES, type Role} from "@/core/db/schema/enums";
import type {SessionUser} from "./auth";
import {hasAnyPermission} from "./permissions";

export const VIEW_AS_COOKIE = "view_as";

export type ViewAs = {kind: "role"; role: Role} | {kind: "user"; userId: string};
export type ViewAsInput = {kind: "off"} | ViewAs;

export function parseViewAs(value: string | undefined): ViewAs | null {
  if (!value) return null;
  if (value.startsWith("role:")) {
    const role = value.slice(5);
    return (ROLES as readonly string[]).includes(role) ? {kind: "role", role: role as Role} : null;
  }
  if (value.startsWith("user:")) {
    const userId = value.slice(5);
    return userId ? {kind: "user", userId} : null;
  }
  return null;
}

export function serializeViewAs(mode: ViewAs | null): string | null {
  if (!mode) return null;
  return mode.kind === "role" ? `role:${mode.role}` : `user:${mode.userId}`;
}

/** Only a tenant user manager (admin) or a platform admin may look through another identity. */
export function canActAs(user: SessionUser): boolean {
  return user.isPlatformAdmin || hasAnyPermission(user.roles, "user:manage");
}

/**
 * Effective identity for the request. A role view keeps the actor's id so row scoping still has a
 * real owner; a user view replaces the identity with the target, limited to the actor's tenant.
 */
export function applyViewAs(real: SessionUser, mode: ViewAs, target: SessionUser | null): SessionUser | null {
  if (mode.kind === "role") {
    return {...real, roles: [mode.role], isPlatformAdmin: false};
  }
  if (!target || target.tenantId !== real.tenantId) return null;
  return target;
}
