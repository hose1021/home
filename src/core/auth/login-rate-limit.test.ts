import {beforeEach, describe, expect, it} from "vitest";
import {clearLoginFailures, isLoginRateLimited, recordLoginFailure} from "./login-rate-limit";

describe("login rate limit", () => {
  beforeEach(() => clearLoginFailures("127.0.0.1", "user.name"));

  it("blocks after five failures within the window", () => {
    for (let i = 0; i < 5; i += 1) recordLoginFailure("127.0.0.1", "user.name", 1000 + i);
    expect(isLoginRateLimited("127.0.0.1", "user.name", 2000)).toBe(true);
  });

  it("resets after the window", () => {
    for (let i = 0; i < 5; i += 1) recordLoginFailure("127.0.0.1", "user.name", 1000 + i);
    expect(isLoginRateLimited("127.0.0.1", "user.name", 901001)).toBe(false);
  });

  it("clears failures after successful authentication", () => {
    recordLoginFailure("127.0.0.1", "user.name", 1000);
    clearLoginFailures("127.0.0.1", "user.name");
    expect(isLoginRateLimited("127.0.0.1", "user.name", 1001)).toBe(false);
  });
});
