import { useMemo } from "react";

import type {
    GridColumn,
    GridRowModel,
    GridRowModelType,
} from "../models";

import { useGridStore } from "../store/useGridStore";

export function useFilteredRows<T extends GridRowModel>(
    rows: T[],
    rowModelType: GridRowModelType = "clientSide"
): T[] {
    const columns = useGridStore<T, GridColumn<T>[]>(
        (state) => state.columns
    );

    const quickFilter = useGridStore<T, string>(
        (state) => state.quickFilter
    );

    return useMemo(() => {
        if (rowModelType === "serverSide") {
            return rows;
        }

        const query =
            quickFilter.trim().toLowerCase();

        if (!query) {
            return rows;
        }

        const visibleColumns =
            columns.filter((column) => !column.hidden);

        return rows.filter((row) =>
            visibleColumns.some((column) => {
                const value = row[column.field];

                return String(value ?? "")
                    .toLowerCase()
                    .includes(query);
            })
        );
    }, [rows, columns, quickFilter, rowModelType]);
}
