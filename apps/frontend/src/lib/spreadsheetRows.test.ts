import { describe, expect, it } from "vitest";
import { hasMeterInputData } from "./spreadsheetRows";

describe("hasMeterInputData", () => {
  it("ignores template rows populated only by generated formula columns", () => {
    expect(hasMeterInputData({
      "Account Number": "",
      Meter: "",
      "Utility / Rate Alert": "",
      "Utility Rate Range": "RateUtility_None"
    })).toBe(false);
  });

  it("keeps partially populated rows so required-field validation can report them", () => {
    expect(hasMeterInputData({
      "Account Number": "",
      Meter: "",
      Utility: "Eversource-CLP",
      "Utility Rate Range": "RateUtility_31"
    })).toBe(true);
  });

  it("treats false and zero as entered spreadsheet values", () => {
    expect(hasMeterInputData({ Active: false })).toBe(true);
    expect(hasMeterInputData({ Demand: 0 })).toBe(true);
  });
});
