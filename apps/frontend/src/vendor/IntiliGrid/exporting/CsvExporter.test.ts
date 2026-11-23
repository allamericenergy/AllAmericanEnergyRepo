import { expect, it } from "vitest";
import { csvCell } from "./CsvExporter";

it.each(["001234", "000", "012345678901234567890", "00123"])("preserves %s as Excel text", (value) => {
    expect(csvCell(value, true)).toBe(`"=""${value}"""`);
});

it("keeps raw CSV values for columns without Excel compatibility enabled", () => {
    expect(csvCell("001234")).toBe('"001234"');
});

it.each(["0", "1234", "00ABC", "00-123", "00\"&NOW()", "line\nnext", "a,b"])("does not wrap arbitrary text %s in a formula", (value) => {
    expect(csvCell(value, true)).toBe(`"${value.replace(/"/g, '""')}"`);
});

it.each(["123456789012", "1234567890123456789012", "5"])("exports %s as Excel text when the column is text", (value) => {
    expect(csvCell(value, false, true)).toBe(`"=""${value}"""`);
});

it.each(["12-34", "AB123", "1 2", "1\"&NOW()"])("does not wrap non-digit text %s for text columns", (value) => {
    expect(csvCell(value, false, true)).toBe(`"${value.replace(/"/g, '""')}"`);
});

it("preserves numeric and empty values", () => {
    expect(csvCell(123, true)).toBe('"123"');
    expect(csvCell(null, true)).toBe('""');
    expect(csvCell(undefined, true)).toBe('""');
});
