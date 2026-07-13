import type { GridColumn, GridRowModel } from "../models";

export function hasPinnedLeftColumns<T extends GridRowModel>(
    columns: GridColumn<T>[]
): boolean {
    return columns.some(
        (column) =>
            !column.hidden &&
            column.pinned === "left"
    );
}

export function hasPinnedRightColumns<T extends GridRowModel>(
    columns: GridColumn<T>[]
): boolean {
    return columns.some(
        (column) =>
            !column.hidden &&
            column.pinned === "right"
    );
}