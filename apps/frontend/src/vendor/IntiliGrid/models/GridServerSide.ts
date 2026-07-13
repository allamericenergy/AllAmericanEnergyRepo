import type { GridRowModel } from "./GridRowModel";
import type { GridSortModel } from "./GridSort";

export type GridRowModelType =
    | "clientSide"
    | "serverSide";

export interface GridServerSideRequest<
    T extends GridRowModel
> {
    page: number;
    pageSize: number;
    startRow: number;
    endRow: number;
    sortModel: GridSortModel<T>;
    quickFilter: string;
}

export interface GridServerSideResult<
    T extends GridRowModel
> {
    rows: T[];
    rowCount: number;
}

export interface GridServerSideGetRowsParams<
    T extends GridRowModel
> {
    request: GridServerSideRequest<T>;
    success(result: GridServerSideResult<T>): void;
    fail(error?: unknown): void;
}

export interface GridServerSideDatasource<
    T extends GridRowModel
> {
    getRows(
        params: GridServerSideGetRowsParams<T>
    ):
        | void
        | GridServerSideResult<T>
        | Promise<GridServerSideResult<T>>;
}
