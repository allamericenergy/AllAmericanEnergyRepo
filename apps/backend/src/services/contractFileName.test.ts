import { describe, expect, it } from "vitest";
import { contractUploadFileName } from "./contractFileName.js";

const commonInput = {
  originalName: "uploaded agreement.pdf",
  companyName: "Acme Energy",
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2027-12-31T00:00:00.000Z"),
  uploadedAt: new Date("2026-07-22T00:00:00.000Z")
};

describe("contractUploadFileName", () => {
  it.each([
    ["Gas", "GSA"],
    ["Power", "ESA"],
    ["Sewer", "SEWERSA"],
    ["Solar", "SolarSA"],
    ["Water", "WSA"]
  ])("uses the agreement prefix for %s", (productName, prefix) => {
    expect(contractUploadFileName({ ...commonInput, productName }))
      .toBe(`${prefix}_Acme Energy_Jan2026 to Dec2027_Jul2026.pdf`);
  });

  it("keeps the original name for an unsupported product", () => {
    expect(contractUploadFileName({ ...commonInput, productName: "Other" }))
      .toBe(commonInput.originalName);
  });
});
