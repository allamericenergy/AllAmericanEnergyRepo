import type {
    GridColumn,
    GridRowModel,
} from "../models";

export function csvCell(value: unknown, preserveLeadingZeros = false): string {
    let text = String(value ?? "");
    // Only digits are allowed in the Excel text formula; never interpolate
    // arbitrary database content into a formula.
    if (preserveLeadingZeros && typeof value === "string" && /^0\d+$/.test(value)) {
        text = `="${value}"`;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

export function exportRowsToCsv<T extends GridRowModel>(
    rows: T[],
    columns: GridColumn<T>[],
    fileName = "grid-export.csv"
) {
    const visibleColumns =
        columns.filter((column) => !column.hidden);

    const headers =
        visibleColumns.map(
            (column) => csvCell(column.headerName)
        );

    const records = rows.map((row) =>
        visibleColumns.map((column) => {
            const value = row[column.field];

            return csvCell(value, column.csvPreserveLeadingZeros);
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
