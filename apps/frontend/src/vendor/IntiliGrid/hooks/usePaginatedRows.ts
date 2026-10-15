import { useMemo } from "react";

import type {
    GridRowModel,
    GridRowModelType,
} from "../models";
import { useGridStore } from "../store/useGridStore";

export function usePaginatedRows<T extends GridRowModel>(
    rows: T[],
    rowModelType: GridRowModelType = "clientSide"
): T[] {
    const pagination = useGridStore<
        T,
        {
            page: number;
            pageSize: number;
        }
    >((state) => state.pagination);

    return useMemo(() => {
        if (rowModelType === "serverSide") {
            return rows;
        }

        const start =
            pagination.page *
            pagination.pageSize;

        const end =
            start +
            pagination.pageSize;

        return rows.slice(start, end);
    }, [
        rows,
        pagination.page,
        pagination.pageSize,
        rowModelType,
    ]);
}
