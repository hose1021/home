import {describe, expect, it} from "vitest";
import type {SessionUser} from "./auth";
import {applyViewAs, canActAs, parseViewAs, serializeViewAs} from "./view-as";

const admin: SessionUser = {
  id: "admin-1",
  tenantId: "tenant-a",
  username: "admin.admin",
  fullName: "Admin Admin",
  roles: ["admin"],
  isPlatformAdmin: false,
};

const owner: SessionUser = {
  id: "owner-1",
  tenantId: "tenant-a",
  username: "ali.mammadov",
  fullName: "Ali Mammadov",
  roles: ["owner"],
  isPlatformAdmin: false,
};

describe("parseViewAs / serializeViewAs", () => {
  it("round-trips a role and a user target", () => {
    expect(parseViewAs(serializeViewAs({kind: "role", role: "owner"})!)).toEqual({kind: "role", role: "owner"});
    expect(parseViewAs(serializeViewAs({kind: "user", userId: "owner-1"})!)).toEqual({kind: "user", userId: "owner-1"});
  });

  it("ignores empty and unknown values", () => {
    expect(parseViewAs(undefined)).toBeNull();
    expect(parseViewAs("")).toBeNull();
    expect(parseViewAs("role:superadmin")).toBeNull();
    expect(parseViewAs("user:")).toBeNull();
    expect(parseViewAs("garbage")).toBeNull();
  });
});

describe("canActAs", () => {
  it("allows a user manager and blocks everyone else", () => {
    expect(canActAs(admin)).toBe(true);
    expect(canActAs(owner)).toBe(false);
    expect(canActAs({...owner, isPlatformAdmin: true})).toBe(true);
  });
});

describe("applyViewAs", () => {
  it("replaces roles but keeps the actor id for a role view", () => {
    const effective = applyViewAs(admin, {kind: "role", role: "owner"}, null);
    expect(effective?.id).toBe(admin.id);
    expect(effective?.roles).toEqual(["owner"]);
    expect(effective?.isPlatformAdmin).toBe(false);
  });

  it("uses the target identity for a user view", () => {
    expect(applyViewAs(admin, {kind: "user", userId: owner.id}, owner)).toEqual(owner);
  });

  it("refuses a missing target or another tenant's user", () => {
    expect(applyViewAs(admin, {kind: "user", userId: owner.id}, null)).toBeNull();
    expect(applyViewAs(admin, {kind: "user", userId: owner.id}, {...owner, tenantId: "tenant-b"})).toBeNull();
  });
});
