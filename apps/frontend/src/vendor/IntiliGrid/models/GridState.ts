import type { GridRowModel } from "./GridRowModel";
import type { GridColumn } from "./GridColumn";
import type { GridSort, GridSortModel } from "./GridSort";
import type { GridSelection } from "./GridSelection";

export interface GridState<T extends GridRowModel> {
    rows: T[];

    rowCount: number;

    columns: GridColumn<T>[];

    loading: boolean;

    sorting: GridSort<T>;

    sortModel: GridSortModel<T>;

    selection: GridSelection<T["id"]>;

    focusedRowId?: T["id"];

    quickFilter: string;

    pagination: {
        page: number;
        pageSize: number;
    };

    editingCell?: {
        rowId: T["id"];
        field: keyof T;
    };
    history: {
        past: T[][];
        future: T[][];
    };
}
