import {describe, expect, it} from "vitest";
import {
  getPermissionsForRole,
  getPermissionsForRoles,
  hasAnyPermission,
  hasPermission,
  hasStaffRole,
  PERMISSIONS,
  ROLES,
} from "./permissions";

describe("hasPermission", () => {
  it("grants an admin every declared permission", () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission("admin", permission)).toBe(true);
    }
  });

  it("grants every declared permission to at least one role", () => {
    for (const permission of PERMISSIONS) {
      expect(ROLES.some((role) => hasPermission(role, permission))).toBe(true);
    }
  });

  it("denies tenant administration to an owner", () => {
    expect(hasPermission("owner", "tenant:read")).toBe(false);
    expect(hasPermission("owner", "tenant:write")).toBe(false);
  });

  it("lets an owner pay but not write charges", () => {
    expect(hasPermission("owner", "payment:write")).toBe(true);
    expect(hasPermission("owner", "charge:write")).toBe(false);
  });

  it("lets a management member write announcements and documents", () => {
    expect(hasPermission("management_member", "announcement:write")).toBe(true);
    expect(hasPermission("management_member", "document:write")).toBe(true);
  });

  it("lets a commandant manage tickets and work orders but not finances", () => {
    expect(hasPermission("commandant", "ticket:write")).toBe(true);
    expect(hasPermission("commandant", "work_order:write")).toBe(true);
    expect(hasPermission("commandant", "finance:write")).toBe(false);
  });

  it("returns false for an unknown role", () => {
    expect(hasPermission("superadmin" as never, "tenant:read")).toBe(false);
  });
});

describe("getPermissionsForRole", () => {
  it("returns no permissions for an unknown role", () => {
    expect(getPermissionsForRole("unknown" as never)).toEqual([]);
  });
});

describe("getPermissionsForRoles", () => {
  it("never returns duplicates", () => {
    const combined = getPermissionsForRoles(["admin", "owner"]);
    expect(new Set(combined).size).toBe(combined.length);
  });

  it("keeps every permission of each role", () => {
    const combined = getPermissionsForRoles(["owner", "commandant"]);
    for (const permission of [
      ...getPermissionsForRole("owner"),
      ...getPermissionsForRole("commandant"),
    ]) {
      expect(combined).toContain(permission);
    }
  });

  it("returns an empty list for no roles", () => {
    expect(getPermissionsForRoles([])).toEqual([]);
  });
});

describe("hasAnyPermission", () => {
  it("returns true when any role grants the permission", () => {
    expect(hasAnyPermission(["owner"], "payment:write")).toBe(true);
    expect(hasAnyPermission(["owner", "commandant"], "ticket:write")).toBe(true);
  });

  it("returns false when no role grants the permission", () => {
    expect(hasAnyPermission(["owner"], "charge:write")).toBe(false);
    expect(hasAnyPermission([], "owner:read")).toBe(false);
  });
});

describe("hasStaffRole", () => {
  it("does not treat an owner-only account as staff", () => {
    expect(hasStaffRole(["owner"])).toBe(false);
  });

  it("recognizes every non-owner role, including mixed accounts", () => {
    expect(hasStaffRole(["management_member"])).toBe(true);
    expect(hasStaffRole(["owner", "commandant"])).toBe(true);
    expect(hasStaffRole(["admin"])).toBe(true);
  });

  it("does not treat an account without roles as staff", () => {
    expect(hasStaffRole([])).toBe(false);
  });
});
