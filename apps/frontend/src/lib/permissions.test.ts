import { describe, expect, it } from "vitest";
import { navByRole, normalizeRole } from "./permissions";

describe("role navigation", () => {
  it("keeps privileged controls out of main navigation", () => {
    expect(navByRole.superadmin).not.toEqual(expect.arrayContaining(["Organizations", "Audit Log", "Admin"]));
  });

  it("hides privileged controls from admins", () => {
    expect(navByRole.admin).not.toEqual(expect.arrayContaining(["Organizations", "Audit Log", "Admin"]));
  });

  it("keeps user navigation limited", () => {
    expect(navByRole.user).toEqual(["Dashboard", "Members", "Activity"]);
  });

  it("normalizes superadmin role variants", () => {
    expect(normalizeRole("superadmin")).toBe("superadmin");
    expect(normalizeRole("Super Admin")).toBe("superadmin");
    expect(normalizeRole("super_admin")).toBe("superadmin");
    expect(normalizeRole("superAdmin")).toBe("superadmin");
  });
});
