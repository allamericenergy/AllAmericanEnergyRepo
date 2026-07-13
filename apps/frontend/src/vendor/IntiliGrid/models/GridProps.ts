import type { GridRowModel } from "./GridRowModel";
import type { GridColumn } from "./GridColumn";
import type {
    GridSort,
    GridSortModel,
    GridSortOrder,
    GridSortingMode,
} from "./GridSort";
import type {
    GridRowModelType,
    GridServerSideDatasource,
} from "./GridServerSide";

export interface GridProps<T extends GridRowModel> {
    rows: T[];

    columns: GridColumn<T>[];

    loading?: boolean;

    checkboxSelection?: boolean;

    rowModelType?: GridRowModelType;

    serverSideDatasource?: GridServerSideDatasource<T>;

    sortingMode?: GridSortingMode;

    sortOrder?: GridSortOrder;

    initialSortModel?: GridSortModel<T>;

    sortModel?: GridSortModel<T>;

    onRowClick?: (row: T) => void;

    onSelectionChange?: (
        selectedIds: T["id"][],
        selectedRows: T[]
    ) => void;

    onSortChange?: (
        sorting: GridSort<T>
    ) => void;

    onSortModelChange?: (
        sortModel: GridSortModel<T>
    ) => void;

    onCellEdit?: (
        rowId: T["id"],
        field: keyof T,
        value: unknown,
        row: T
    ) => void;
}
