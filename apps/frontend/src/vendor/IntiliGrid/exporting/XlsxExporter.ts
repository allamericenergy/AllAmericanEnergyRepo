import * as XLSX from "xlsx";

import type {
    GridColumn,
    GridRowModel,
} from "../models";
import { getExportColumns, getExportValue } from "./exportValue";

export function exportRowsToXlsx<T extends GridRowModel>(
    rows: T[],
    columns: GridColumn<T>[],
    fileName = "grid-export.xlsx"
): void {
    const visibleColumns =
        getExportColumns(columns);

    const data = rows.map((row) => {
        const record: Record<string, unknown> = {};

        for (const column of visibleColumns) {
            record[column.headerName] =
                getExportValue(row, column);
        }

        return record;
    });

    const worksheet =
        XLSX.utils.json_to_sheet(data);

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Data"
    );

    XLSX.writeFile(workbook, fileName);
}