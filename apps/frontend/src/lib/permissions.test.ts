import { describe, expect, it } from "vitest";
import { navByRole } from "./permissions";

describe("role navigation", () => {
  it("shows admin controls to admins", () => {
    expect(navByRole.admin).toContain("Admin");
  });

  it("keeps user navigation limited", () => {
    expect(navByRole.user).toEqual(["Dashboard", "Contacts", "Tasks"]);
  });
});
