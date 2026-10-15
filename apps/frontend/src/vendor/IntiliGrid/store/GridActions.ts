import type {
    GridColumn,
    GridRowModel,
    GridSortDirection,
    GridSortModel,
} from "../models";

export interface GridActions<T extends GridRowModel> {
    setRows(rows: T[]): void;

    setRowCount(rowCount: number): void;

    setColumns(columns: GridColumn<T>[]): void;

    setColumnWidth(
        field: keyof T,
        width: number,
    ): void;

    hideColumn(field: keyof T): void;

    showColumn(field: keyof T): void;

    toggleColumnVisibility(field: keyof T): void;

    setLoading(value: boolean): void;

    setSorting(
        field?: keyof T,
        direction?: GridSortDirection
    ): void;

    setSortModel(sortModel: GridSortModel<T>): void;

    clearSorting(): void;

    selectRow(id: T["id"]): void;

    deselectRow(id: T["id"]): void;

    toggleRow(id: T["id"]): void;

    selectRows(ids: T["id"][]): void;

    clearSelection(): void;

    setSelectionAnchor(id?: T["id"]): void;

    setFocusedRow(id: T["id"]): void;

    clearFocusedRow(): void;

    setQuickFilter(value: string): void;

    clearQuickFilter(): void;
    setPage(page: number): void;

    setPageSize(pageSize: number): void;

    nextPage(): void;

    previousPage(): void;

    firstPage(): void;

    lastPage(): void;

    pinColumn(
        field: keyof T,
        side: "left" | "right"
    ): void;

    unpinColumn(field: keyof T): void;

    startCellEdit(
        rowId: T["id"],
        field: keyof T
    ): void;

    stopCellEdit(): void;

    updateCellValue(
        rowId: T["id"],
        field: keyof T,
        value: unknown
    ): void;

    undo(): void;

    redo(): void;

    clearHistory(): void;

}
