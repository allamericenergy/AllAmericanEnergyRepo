import type { GridColumn, GridRowModel, GridSort } from "../models";
import type { GridStore } from "./createGridStore";

export const selectRows = <T extends GridRowModel>(
    state: GridStore<T>
): T[] => state.rows;

export const selectColumns = <T extends GridRowModel>(
    state: GridStore<T>
): GridColumn<T>[] => state.columns;

export const selectLoading = <T extends GridRowModel>(
    state: GridStore<T>
): boolean => state.loading;

export const selectSorting = <T extends GridRowModel>(
    state: GridStore<T>
): GridSort<T> => state.sorting;

export const selectSelectedRows = <T extends GridRowModel>(
    state: GridStore<T>
): Set<T["id"]> => state.selection.selectedRows;

export const selectSelectionAnchor = <T extends GridRowModel>(
    state: GridStore<T>
): T["id"] | undefined => state.selection.anchor;