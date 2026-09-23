import { expect, it } from "vitest";
import { contractMeterLabel } from "./contractMeterLabel";

it.each([
  ["Account Number", "ACCOUNT"],
  ["Service Ref/POD ID", "POD"],
  ["BOTH", "ACCOUNTPOD"]
] as const)("uses the utility MasterAccountNumber choice %s", (masterAccountNumberType, expected) => {
  expect(contractMeterLabel({ id: 1, accountNumber: "ACCOUNT", serviceRefPod: "POD", masterAccountNumberType })).toBe(expected);
});

it("keeps the existing label when no utility setting exists", () => {
  expect(contractMeterLabel({ id: 1, accountNumber: "ACCOUNT" })).toBe("ACCOUNT");
});

it("does not substitute an unselected field when the selected value is missing", () => {
  expect(contractMeterLabel({ id: 1, accountNumber: "ACCOUNT", masterAccountNumberType: "Service Ref/POD ID" })).toBe("-");
  expect(contractMeterLabel({ id: 1, serviceRefPod: "POD", masterAccountNumberType: "Account Number" })).toBe("-");
});

it("shows missing values explicitly when BOTH is selected", () => {
  expect(contractMeterLabel({ id: 1, accountNumber: " ACCOUNT ", masterAccountNumberType: "BOTH" })).toBe("ACCOUNT-");
});

it("uses each meter's utility choice in a mixed utility list", () => {
  const meters = [
    { id: 1, accountNumber: "A1", serviceRefPod: "P1", masterAccountNumberType: "Account Number" as const },
    { id: 2, accountNumber: "A2", serviceRefPod: "P2", masterAccountNumberType: "Service Ref/POD ID" as const },
    { id: 3, accountNumber: "A3", serviceRefPod: "P3", masterAccountNumberType: "BOTH" as const }
  ];
  expect(meters.map(contractMeterLabel)).toEqual(["A1", "P2", "A3P3"]);
});
