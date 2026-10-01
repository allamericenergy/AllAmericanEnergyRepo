import { describe, expect, it } from "vitest";
import { formatCompanyPhone } from "./companyPhone";

describe("company phone formatting", () => {
  it.each(["2125550100", "212-555-0100", "(212) 555-0100", "212.555.0100"])("formats %s", (value) => {
    expect(formatCompanyPhone(value)).toBe("212-555-0100");
  });
  it.each(["", "5550100", "12125550100", "2125550100 ext 5", "+442125550100"])("keeps invalid input %s invalid", (value) => {
    expect(formatCompanyPhone(value)).not.toMatch(/^\d{3}-\d{3}-\d{4}$/);
  });
  it("preserves leading zeros from spreadsheet text cells", () => {
    expect(formatCompanyPhone("0123456789")).toBe("012-345-6789");
  });
});
