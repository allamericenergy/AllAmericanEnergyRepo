import type {
    GridColumn,
    GridRowModel,
} from "../models";
import { getExportColumns, getExportValue } from "./exportValue";

export function csvCell(value: unknown, preserveLeadingZeros = false, asText = false): string {
    let text = String(value ?? "");
    // Only digits are allowed in the Excel text formula; never interpolate
    // arbitrary database content into a formula.
    const isDigits = /^\d+$/.test(text);
    const forceText =
        (asText && isDigits && (typeof value === "string" || typeof value === "number")) ||
        (preserveLeadingZeros && typeof value === "string" && /^0\d+$/.test(value));
    if (forceText) {
        text = `="${text}"`;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

export function exportRowsToCsv<T extends GridRowModel>(
    rows: T[],
    columns: GridColumn<T>[],
    fileName = "grid-export.csv"
) {
    const visibleColumns =
        getExportColumns(columns);

    const headers =
        visibleColumns.map(
            (column) => csvCell(column.headerName)
        );

    const records = rows.map((row) =>
        visibleColumns.map((column) => {
            const value = getExportValue(row, column);

            return csvCell(value, column.csvPreserveLeadingZeros, column.exportAsText);
        })
    );

    const csv = [
        headers.join(","),
        ...records.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(
        [csv],
        {
            type: "text/csv;charset=utf-8;",
        }
    );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
