import { useMemo } from "react";

import type {
    GridColumn,
    GridRowModel,
    GridSortModel,
    GridSortingMode,
} from "../models";

import { useGridStore } from "../store/useGridStore";
import { sortRowsByModel } from "../sorting/SortingEngine";

export function useSortedRows<T extends GridRowModel>(
    sortingMode: GridSortingMode = "client"
): T[] {
    const rows = useGridStore<T, T[]>(
        (state) => state.rows
    );

    const columns = useGridStore<T, GridColumn<T>[]>(
        (state) => state.columns
    );

    const sortModel = useGridStore<T, GridSortModel<T>>(
        (state) => state.sortModel
    );

    return useMemo(() => {
        if (sortingMode === "server") {
            return rows;
        }

        if (sortModel.length === 0) {
            return rows;
        }

        return sortRowsByModel(
            rows,
            sortModel,
            columns
        );
    }, [
        rows,
        columns,
        sortModel,
        sortingMode,
    ]);
}
