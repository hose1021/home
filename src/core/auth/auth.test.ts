import {describe, expect, it} from "vitest";
import {
    assertValidUsername,
    hashPassword,
    hashSessionToken,
    normalizeUsername,
    rolesFromDatabase,
    verifyPassword
} from "./auth";

describe("normalizeUsername", () => {
  it("trims and lowercases with az locale", () => {
    expect(normalizeUsername("  Ali.Mammadov  ")).toBe("ali.mammadov");
  });

  it("handles Turkish-Azerbaijani chars", () => {
    expect(normalizeUsername("Əli.Şıx")).toBe("əli.şıx");
  });
});

describe("assertValidUsername", () => {
  it("accepts name.surname format", () => {
    expect(() => assertValidUsername("ali.mammadov")).not.toThrow();
  });

  it("rejects single word", () => {
    expect(() => assertValidUsername("ali")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => assertValidUsername("")).toThrow();
  });

  it("rejects with numbers", () => {
    expect(() => assertValidUsername("ali123.mammadov")).toThrow();
  });

  it("rejects with spaces", () => {
    expect(() => assertValidUsername("ali.mammadov2")).toThrow();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for same password (salt)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
  });
});

describe("rolesFromDatabase", () => {
  it("does not grant an implicit owner role when no assignment exists", () => {
    expect(rolesFromDatabase([])).toEqual([]);
  });

  it("deduplicates role rows", () => {
    expect(rolesFromDatabase([{role: "owner"}, {role: "owner"}, {role: "commandant"}]))
      .toEqual(["owner", "commandant"]);
  });
});

describe("hashSessionToken", () => {
  it("creates a deterministic SHA-256 digest without retaining the raw token", () => {
    const token = "raw-session-token";
    const digest = hashSessionToken(token);

    expect(digest).toHaveLength(64);
    expect(digest).not.toBe(token);
    expect(hashSessionToken(token)).toBe(digest);
  });
});
