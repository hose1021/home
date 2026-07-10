import {describe, it, expect} from "vitest";
import {
  hasPermission,
  getPermissionsForRole,
  getPermissionsForRoles,
  hasAnyPermission,
  ROLE_LABELS,
  ROLE_ORDER,
  type Permission,
} from "./permissions";

describe("hasPermission", () => {
  it("admin has all permissions", () => {
    const allPerms: Permission[] = [
      "tenant:read", "tenant:write", "building:read", "building:write",
      "unit:read", "unit:write", "owner:read", "owner:write",
      "resident:read", "resident:write", "voting:read", "voting:write",
      "meeting:read", "meeting:write", "protocol:read", "protocol:write", "protocol:sign",
      "finance:read", "finance:write", "charge:read", "charge:write",
      "payment:read", "payment:write", "debt:read", "debt:write",
      "fund:read", "fund:write", "budget:read", "budget:write",
      "contractor:read", "contractor:write", "work_order:read", "work_order:write",
      "ticket:read", "ticket:write", "document:read", "document:write",
      "announcement:read", "announcement:write", "notification:send",
      "audit:read", "audit:write", "report:read", "report:generate",
      "settings:read", "settings:write", "user:manage",
    ];
    for (const perm of allPerms) {
      expect(hasPermission("admin", perm)).toBe(true);
    }
  });

  it("owner can read but not write tenants", () => {
    expect(hasPermission("owner", "tenant:read")).toBe(false);
    expect(hasPermission("owner", "tenant:write")).toBe(false);
  });

  it("owner can pay but not generate charges", () => {
    expect(hasPermission("owner", "payment:write")).toBe(true);
    expect(hasPermission("owner", "charge:write")).toBe(false);
  });

  it("management_member can manage announcements", () => {
    expect(hasPermission("management_member", "announcement:write")).toBe(true);
    expect(hasPermission("management_member", "announcement:read")).toBe(true);
  });

  it("commandant cannot manage finances", () => {
    expect(hasPermission("commandant", "finance:write")).toBe(false);
    expect(hasPermission("commandant", "charge:write")).toBe(false);
  });

  it("commandant can manage tickets and work orders", () => {
    expect(hasPermission("commandant", "ticket:write")).toBe(true);
    expect(hasPermission("commandant", "work_order:write")).toBe(true);
  });

  it("returns false for unknown role", () => {
    expect(hasPermission("superadmin" as never, "tenant:read")).toBe(false);
  });
});

describe("getPermissionsForRole", () => {
  it("admin has the most permissions", () => {
    const adminPerms = getPermissionsForRole("admin");
    const ownerPerms = getPermissionsForRole("owner");
    expect(adminPerms.length).toBeGreaterThan(ownerPerms.length);
  });

  it("returns empty array for unknown role", () => {
    expect(getPermissionsForRole("unknown" as never)).toEqual([]);
  });

  it("every role has at least one permission", () => {
    for (const role of ["admin", "management_member", "commandant", "owner"] as const) {
      expect(getPermissionsForRole(role).length).toBeGreaterThan(0);
    }
  });
});

describe("getPermissionsForRoles", () => {
  it("merges permissions from multiple roles (dedup)", () => {
    const adminOnly = getPermissionsForRoles(["admin"]);
    const adminAndOwner = getPermissionsForRoles(["admin", "owner"]);
    expect(adminAndOwner.length).toBe(adminOnly.length);
  });

  it("combines distinct permissions", () => {
    const ownerPerms = getPermissionsForRoles(["owner"]);
    const commandantPerms = getPermissionsForRoles(["commandant"]);
    const combined = getPermissionsForRoles(["owner", "commandant"]);
    expect(combined.length).toBeGreaterThan(ownerPerms.length);
    expect(combined.length).toBeGreaterThan(commandantPerms.length);
  });

  it("returns empty for empty roles", () => {
    expect(getPermissionsForRoles([])).toEqual([]);
  });
});

describe("hasAnyPermission", () => {
  it("returns true if any role has the permission", () => {
    expect(hasAnyPermission(["owner"], "payment:write")).toBe(true);
    expect(hasAnyPermission(["owner", "commandant"], "ticket:write")).toBe(true);
  });

  it("returns false if no role has the permission", () => {
    expect(hasAnyPermission(["owner"], "charge:write")).toBe(false);
    expect(hasAnyPermission(["commandant"], "finance:write")).toBe(false);
  });

  it("returns false for empty roles", () => {
    expect(hasAnyPermission([], "owner:read")).toBe(false);
  });
});

describe("ROLE_LABELS / ROLE_ORDER", () => {
  it("every role has a label", () => {
    for (const role of ["admin", "management_member", "commandant", "owner"] as const) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });

  it("ROLE_ORDER contains all 4 roles", () => {
    expect(ROLE_ORDER).toHaveLength(4);
    expect(new Set(ROLE_ORDER)).toEqual(new Set(["admin", "management_member", "commandant", "owner"]));
  });
});
