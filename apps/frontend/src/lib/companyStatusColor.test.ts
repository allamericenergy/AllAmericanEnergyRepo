import { describe, expect, it } from "vitest";
import { companyRowBackground, companyStatusColor, effectiveCompanyStatus } from "./companyStatusColor";

describe("effectiveCompanyStatus", () => {
  it("shows Inactive whenever the existing activation flag is off", () => {
    expect(effectiveCompanyStatus({ companyStatus: "Pending", isActive: false })).toBe("Inactive");
  });

  it("shows the configured status for active companies", () => {
    expect(effectiveCompanyStatus({ companyStatus: "Pending", isActive: true })).toBe("Pending");
  });

  it("falls back to Active for active companies without a configured status", () => {
    expect(effectiveCompanyStatus({ companyStatus: null, isActive: true })).toBe("Active");
  });

  it("uses the existing status colors for activation values", () => {
    expect(companyStatusColor("Active")).toEqual({ color: "#166534", backgroundColor: "#dcfce7" });
    expect(companyStatusColor("Inactive")).toEqual({ color: "#991b1b", backgroundColor: "#fee2e2" });
  });
});

describe("companyRowBackground", () => {
  it("highlights closed companies with a light red-orange background", () => {
    expect(companyRowBackground({ companyStatus: " Closed ", isActive: true })).toBe("#fff1e6");
  });

  it("does not highlight other company statuses", () => {
    expect(companyRowBackground({ companyStatus: "Pending", isActive: true })).toBeUndefined();
  });

  it("highlights inactive companies with light gray", () => {
    expect(companyRowBackground({ companyStatus: "Sold", isActive: false })).toBe("#f1f5f9");
  });

  it("highlights sold companies with light red", () => {
    expect(companyRowBackground({ companyStatus: "Sold", isActive: true })).toBe("#fee2e2");
  });
});
