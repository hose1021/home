import {describe, expect, it} from "vitest";
import {canMutateTenant, type Session} from "./session";

function session(tenantId: string, isPlatformAdmin: boolean): Session {
  return {
    user: {
      id: "user-id",
      tenantId,
      username: "admin.user",
      fullName: "Admin User",
      roles: ["admin"],
      isPlatformAdmin,
    },
  };
}

describe("canMutateTenant", () => {
  it("allows scoped admins to mutate their own tenant", () => {
    expect(canMutateTenant(session("tenant-a", false), "tenant-a")).toBe(true);
  });

  it("blocks scoped admins from mutating another tenant", () => {
    expect(canMutateTenant(session("tenant-a", false), "tenant-b")).toBe(false);
  });

  it("allows platform admins to mutate any tenant", () => {
    expect(canMutateTenant(session("tenant-a", true), "tenant-b")).toBe(true);
  });
});
