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

  it("uses the requested company status badge colors", () => {
    expect(companyStatusColor("Active")).toEqual({ color: "#fff", backgroundColor: "#0ab39c", borderRadius: "4px" });
    expect(companyStatusColor("Inactive")).toEqual({ color: "#fff", backgroundColor: "#f06548", borderRadius: "4px" });
    expect(companyStatusColor("Sold")).toEqual({ color: "#fff", backgroundColor: "#405189", borderRadius: "4px" });
    expect(companyStatusColor("Closed")).toEqual({ color: "#fff", backgroundColor: "#ff1919", borderRadius: "4px" });
  });

  it("uses the requested meter status badge colors", () => {
    expect(companyStatusColor("DROP REQUESTED")).toEqual({ color: "#fff", backgroundColor: "#0f5da8", borderRadius: "4px" });
    expect(companyStatusColor("NO CONTRACT")).toEqual({ color: "#fff", backgroundColor: "#289730", borderRadius: "4px" });
    expect(companyStatusColor("UNDER CONTRACT")).toEqual({ color: "#fff", backgroundColor: "#AEB914", borderRadius: "4px" });
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
