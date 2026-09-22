import { expect, it } from "vitest";
import { contractMeterLabel } from "./contractMeterLabel";

it.each([
  [true, true, "ACCOUNTPOD"],
  [true, false, "ACCOUNT"],
  [false, true, "POD"],
  [false, false, "-"]
])("uses utility flags %s / %s", (account, pod, expected) => {
  expect(contractMeterLabel({ id: 1, accountNumber: "ACCOUNT", serviceRefPod: "POD", masterAccountNumber: account as boolean, masterServiceRefPodId: pod as boolean })).toBe(expected);
});

it("keeps the existing label when no utility setting exists", () => {
  expect(contractMeterLabel({ id: 1, accountNumber: "ACCOUNT" })).toBe("ACCOUNT");
});

it("does not substitute a disabled field when the enabled value is missing", () => {
  expect(contractMeterLabel({ id: 1, accountNumber: "ACCOUNT", masterAccountNumber: false, masterServiceRefPodId: true })).toBe("-");
});
