const GENERATED_METER_TEMPLATE_COLUMNS = new Set([
  "utilityratealert",
  "utilityraterange"
]);

function normalizeSpreadsheetHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function hasMeterInputData(row: Record<string, unknown>) {
  return Object.entries(row).some(([header, value]) => {
    if (GENERATED_METER_TEMPLATE_COLUMNS.has(normalizeSpreadsheetHeader(header))) return false;
    return String(value ?? "").trim() !== "";
  });
}
