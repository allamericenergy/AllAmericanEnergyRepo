import type { GridRowModel, GridSortModel } from "../models";

export interface GridApi<T extends GridRowModel> {
    getRows(): T[];

    getSelectedRows(): T[];

    getSelectedIds(): T["id"][];

    selectRow(id: T["id"]): void;

    deselectRow(id: T["id"]): void;

    toggleRow(id: T["id"]): void;

    hideColumn(field: keyof T): void;

    showColumn(field: keyof T): void;

    toggleColumnVisibility(field: keyof T): void;

    selectAll(): void;

    selectRange(
        startId: T["id"],
        endId: T["id"]
    ): void;

    selectRangeTo(
        endId: T["id"]
    ): void;

    clearSelection(): void;

    sort(
        field: keyof T,
        direction: "asc" | "desc"
    ): void;

    pinColumn(
        field: keyof T,
        side: "left" | "right"
    ): void;

    unpinColumn(field: keyof T): void;

    clearSorting(): void;

    setSortModel(sortModel: GridSortModel<T>): void;

    getSortModel(): GridSortModel<T>;

    refresh(): void;

    setQuickFilter(value: string): void;

    clearQuickFilter(): void;

    getQuickFilter(): string;

    setPage(page: number): void;

    setPageSize(pageSize: number): void;

    nextPage(): void;

    previousPage(): void;

    firstPage(): void;

    lastPage(): void;

    getPage(): number;

    getPageSize(): number;

    exportCsv(
        mode?:
            | "all"
            | "selected"
            | "visible"
    ): void;

    undo(): void;

    redo(): void;

    canUndo(): boolean;

    canRedo(): boolean;

    clearHistory(): void;
}
