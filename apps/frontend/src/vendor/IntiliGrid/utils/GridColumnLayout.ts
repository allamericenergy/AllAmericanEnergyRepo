import type {
    GridColumn,
    GridRowModel,
} from "../models";

export interface CalculatedColumn<
    T extends GridRowModel
> extends GridColumn<T> {
    computedWidth: number;
}

export function calculateColumnLayout<
    T extends GridRowModel
>(
    columns: GridColumn<T>[],
    containerWidth: number
): CalculatedColumn<T>[] {
    const visibleColumns =
        columns.filter((column) => !column.hidden);

    let fixedWidth = 0;
    let totalFlex = 0;

    visibleColumns.forEach((column) => {
        if (column.flex) {
            totalFlex += column.flex;
        } else {
            fixedWidth += column.width ?? 150;
        }
    });

    const remaining =
        Math.max(containerWidth - fixedWidth, 0);

    return visibleColumns.map((column) => {
        let width = column.width ?? 150;

        if (column.flex && totalFlex > 0) {
            width =
                remaining *
                (column.flex / totalFlex);
        }

        if (column.minWidth) {
            width = Math.max(width, column.minWidth);
        }

        if (column.maxWidth) {
            width = Math.min(width, column.maxWidth);
        }

        return {
            ...column,
            computedWidth: width,
        };
    });
  }