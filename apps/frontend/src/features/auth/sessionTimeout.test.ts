import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSessionInactive, recordSessionActivity, SESSION_LAST_ACTIVITY_KEY, SESSION_TIMEOUT_MS, SESSION_WARNING_MS, sessionTimeRemaining } from "./sessionTimeout";

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  });
});

describe("session inactivity timeout", () => {
  it("expires after nine minutes", () => {
    recordSessionActivity(1_000);
    expect(sessionTimeRemaining(1_000 + SESSION_TIMEOUT_MS - 1)).toBe(1);
    expect(isSessionInactive(1_000 + SESSION_TIMEOUT_MS)).toBe(true);
  });

  it("enters the warning period for the final minute", () => {
    recordSessionActivity(1_000);
    expect(sessionTimeRemaining(1_000 + SESSION_TIMEOUT_MS - SESSION_WARNING_MS)).toBe(SESSION_WARNING_MS);
  });

  it("records renewed activity", () => {
    recordSessionActivity(42_000);
    expect(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY)).toBe("42000");
    expect(sessionTimeRemaining(42_000)).toBe(SESSION_TIMEOUT_MS);
  });
});
