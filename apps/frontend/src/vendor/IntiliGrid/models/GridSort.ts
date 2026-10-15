import type { GridRowModel } from "./GridRowModel";

export type GridSortDirection =
    | "asc"
    | "desc"
    | null;

export type GridSortOrder = GridSortDirection[];

export interface GridSort<
    T extends GridRowModel
> {
    field?: keyof T;
    direction: GridSortDirection;
}

export interface GridSortItem<
    T extends GridRowModel
> {
    field: keyof T;
    direction: Exclude<GridSortDirection, null>;
}

export type GridSortModel<
    T extends GridRowModel
> = GridSortItem<T>[];

export type GridSortingMode =
    | "client"
    | "server";
