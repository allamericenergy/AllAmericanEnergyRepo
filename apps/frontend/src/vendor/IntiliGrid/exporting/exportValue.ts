import type {
    GridColumn,
    GridRowModel,
} from "../models";

export function getExportColumns<T extends GridRowModel>(
    columns: GridColumn<T>[]
): GridColumn<T>[] {
    return columns.filter(
        (column) => !column.hidden && !column.excludeFromExport
    );
}

/** Resolve the human-readable value of a cell for export, matching what the grid displays. */
export function getExportValue<T extends GridRowModel>(
    row: T,
    column: GridColumn<T>
): unknown {
    const value = row[column.field];

    if (column.exportValue) {
        return column.exportValue(row, value);
    }

    if (column.valueFormatter) {
        return column.valueFormatter(value);
    }

    return value;
}
