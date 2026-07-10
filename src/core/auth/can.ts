import type {Permission} from "./permissions";

export function can(permissions: Permission[], perm: Permission): boolean {
  return permissions.includes(perm);
}

export function canAny(permissions: Permission[], perms: Permission[]): boolean {
  return perms.some((p) => permissions.includes(p));
}
