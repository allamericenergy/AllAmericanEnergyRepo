import type {
    GridColumn,
    GridRowModel,
} from "../models";

function getColumnWidth<T extends GridRowModel>(
    column: GridColumn<T>
): number {
    return (
        column.width ??
        column.minWidth ??
        180
    );
}

export function getPinnedLeftColumns<
    T extends GridRowModel
>(
    columns: GridColumn<T>[]
): GridColumn<T>[] {
    return columns.filter(
        (column) =>
            !column.hidden &&
            column.pinned === "left"
    );
}

export function getPinnedRightColumns<
    T extends GridRowModel
>(
    columns: GridColumn<T>[]
): GridColumn<T>[] {
    return columns.filter(
        (column) =>
            !column.hidden &&
            column.pinned === "right"
    );
}

export function getPinnedLeftOffset<
    T extends GridRowModel
>(
    columns: GridColumn<T>[],
    field: keyof T
): number {
    const pinned =
        getPinnedLeftColumns(columns);

    let offset = 0;

    for (const column of pinned) {
        if (column.field === field) {
            return offset;
        }

        offset += getColumnWidth(column);
    }

    return 0;
}

export function getPinnedRightOffset<
    T extends GridRowModel
>(
    columns: GridColumn<T>[],
    field: keyof T
): number {
    const pinned =
        getPinnedRightColumns(columns);

    let offset = 0;

    for (
        let index = pinned.length - 1;
        index >= 0;
        index--
    ) {
        const column = pinned[index];

        if (!column) {
            continue;
        }

        if (column.field === field) {
            return offset;
        }

        offset += getColumnWidth(column);
    }

    return 0;
}