import type {
    GridColumn,
    GridRowModel,
} from "../models";

export function exportRowsToCsv<T extends GridRowModel>(
    rows: T[],
    columns: GridColumn<T>[],
    fileName = "grid-export.csv"
) {
    const visibleColumns =
        columns.filter((column) => !column.hidden);

    const headers =
        visibleColumns.map(
            (column) => column.headerName
        );

    const records = rows.map((row) =>
        visibleColumns.map((column) => {
            const value = row[column.field];

            return `"${String(value ?? "")
                .replace(/"/g, '""')}"`;
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