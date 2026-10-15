import type {
    GridColumn,
    GridRowModel,
    GridSort,
    GridSortModel,
    GridSortOrder,
} from "../models";

import type { GridStore } from "../store/createGridStore";
import type { StoreApi } from "zustand";

import { GridSelectionEngine } from "../selection/GridSelectionEngine";
import { SortingEngine } from "../sorting/SortingEngine";
import { FilteringEngine } from "../filtering";
import { PaginationEngine } from "../pagination";
import { EditingEngine } from "../editing";
import { exportRowsToCsv } from "../exporting";
import { exportRowsToXlsx } from "../exporting";
import { HistoryEngine } from "../history";

export class GridRuntime<
    T extends GridRowModel
> {
    private readonly store: StoreApi<GridStore<T>>;

    readonly selection: GridSelectionEngine<T>;

    readonly sorting: SortingEngine<T>;

    readonly filtering: FilteringEngine<T>;

    readonly pagination: PaginationEngine<T>;

    readonly editing: EditingEngine<T>;

    readonly history: HistoryEngine<T>;

    constructor(
        store: StoreApi<GridStore<T>>
    ) {
        this.store = store;

        this.selection =
            new GridSelectionEngine(store);

        this.sorting =
            new SortingEngine(store);

        this.filtering = new FilteringEngine(store);

        this.pagination = new PaginationEngine(store);

        this.editing = new EditingEngine(store);

        this.history = new HistoryEngine(store);

        Object.freeze(this);
    }


    startCellEdit(
        rowId: T["id"],
        field: keyof T
    ): void {
        this.editing.startCellEdit(rowId, field);
    }

    stopCellEdit(): void {
        this.editing.stopCellEdit();
    }

    commitCellEdit(
        rowId: T["id"],
        field: keyof T,
        value: unknown
    ): void {
        this.editing.commitCellEdit(
            rowId,
            field,
            value
        );
    }

    cancelCellEdit(): void {
        this.editing.cancelCellEdit();
    }


    // =============================
    // STATE
    // =============================

    getState(): GridStore<T> {
        return this.store.getState();
    }

    // =============================
    // ROWS
    // =============================

    getRows(): T[] {
        return this.store.getState().rows;
    }

    setRows(rows: T[]): void {
        this.store.getState().setRows(rows);
    }

    // =============================
    // COLUMNS
    // =============================

    getColumns(): GridColumn<T>[] {
        return this.store.getState().columns;
    }

    setColumns(
        columns: GridColumn<T>[]
    ): void {
        this.store.getState().setColumns(columns);
    }

    hideColumn(field: keyof T): void {
        this.store.getState().hideColumn(field);
    }

    showColumn(field: keyof T): void {
        this.store.getState().showColumn(field);
    }

    toggleColumnVisibility(field: keyof T): void {
        this.store.getState().toggleColumnVisibility(field);
    }

    // =============================
    // LOADING
    // =============================

    isLoading(): boolean {
        return this.store.getState().loading;
    }

    setLoading(
        value: boolean
    ): void {
        this.store.getState().setLoading(value);
    }

    // =============================
    // SORTING
    // =============================

    sort(
        field: keyof T,
        direction: "asc" | "desc"
    ): void {
        this.sorting.sort(
            field,
            direction
        );
    }

    toggleSorting(
        field: keyof T,
        options?: {
            multi?: boolean;
            sortOrder?: GridSortOrder;
        }
    ): void {
        this.sorting.toggle(field, options);
    }

    clearSorting(): void {
        this.sorting.clear();
    }

    getSorting(): GridSort<T> {
        return this.sorting.getState();
    }

    setSortModel(sortModel: GridSortModel<T>): void {
        this.sorting.setSortModel(sortModel);
    }

    getSortModel(): GridSortModel<T> {
        return this.sorting.getSortModel();
    }

    // =============================
    // SELECTION
    // =============================

    selectRow(
        id: T["id"]
    ): void {
        this.selection.selectRow(id);
    }

    deselectRow(
        id: T["id"]
    ): void {
        this.selection.deselectRow(id);
    }

    toggleRow(
        id: T["id"]
    ): void {
        this.selection.toggleRow(id);
    }

    selectAll(): void {
        this.selection.selectAll();
    }

    clearSelection(): void {
        this.selection.clear();
    }

    isRowSelected(
        id: T["id"]
    ): boolean {
        return this.selection.isSelected(id);
    }

    getSelectedIds(): T["id"][] {
        return this.selection.getSelectedIds();
    }

    getSelectedRows(): T[] {
        return this.selection.getSelectedRows();
    }

    selectRange(
        startId: T["id"],
        endId: T["id"]
    ): void {
        this.selection.selectRange(startId, endId);
    }

    selectRangeTo(
        endId: T["id"]
    ): void {
        this.selection.selectRangeTo(endId);
    }

    // =============================
    // LIFECYCLE
    // =============================

    refresh(): void {
        // future:
        // filtering
        // grouping
        // virtualization
    }

    destroy(): void {
        // future:
        // events
        // plugins
        // observers
    }
    // =============================
    //QuickFilter
    // =============================

    setQuickFilter(value: string): void {
        this.filtering.setQuickFilter(value);
    }

    clearQuickFilter(): void {
        this.filtering.clearQuickFilter();
    }

    getQuickFilter(): string {
        return this.filtering.quickFilter;
    }

    // =============================
    // pinColumn
    // =============================
    pinColumn(
        field: keyof T,
        side: "left" | "right"
    ): void {
        this.store.getState().pinColumn(field, side);
    }

    unpinColumn(field: keyof T): void {
        this.store.getState().unpinColumn(field);
    }

    // =============================
    // Page
    // =============================

    setPage(page: number): void {
        this.pagination.setPage(page);
    }

    setPageSize(pageSize: number): void {
        this.pagination.setPageSize(pageSize);
    }

    nextPage(): void {
        this.pagination.nextPage();
    }

    previousPage(): void {
        this.pagination.previousPage();
    }

    firstPage(): void {
        this.pagination.firstPage();
    }

    lastPage(): void {
        this.pagination.lastPage();
    }

    getPage(): number {
        return this.pagination.page;
    }

    getPageSize(): number {
        return this.pagination.pageSize;
    }


    // =============================
    // focusRow
    // =============================

    focusRow(id: T["id"]): void {
        this.store.getState().setFocusedRow(id);
    }

    clearFocus(): void {
        this.store.getState().clearFocusedRow();
    }

    getFocusedRowId(): T["id"] | undefined {
        return this.store.getState().focusedRowId;
    }

    focusFirstRow(): void {
        const first = this.getRows()[0];

        if (first) {
            this.focusRow(first.id);
        }
    }

    focusLastRow(): void {
        const rows = this.getRows();
        const last = rows[rows.length - 1];

        if (last) {
            this.focusRow(last.id);
        }
    }

    focusNextRow(): void {
        const rows = this.getRows();

        if (rows.length === 0) return;

        const focusedId = this.getFocusedRowId();

        if (!focusedId) {
            this.focusRow(rows[0].id);
            return;
        }

        const index = rows.findIndex(
            (row) => row.id === focusedId
        );

        const next = rows[Math.min(index + 1, rows.length - 1)];

        if (next) {
            this.focusRow(next.id);
        }
    }

    focusPreviousRow(): void {
        const rows = this.getRows();

        if (rows.length === 0) return;

        const focusedId = this.getFocusedRowId();

        if (!focusedId) {
            this.focusRow(rows[0].id);
            return;
        }

        const index = rows.findIndex(
            (row) => row.id === focusedId
        );

        const previous = rows[Math.max(index - 1, 0)];

        if (previous) {
            this.focusRow(previous.id);
        }
    }
    exportCsv(
        mode:
            | "all"
            | "selected"
            | "visible" = "visible"
    ): void {
        const state =
            this.store.getState();

        let rows =
            state.rows;

        if (mode === "selected") {
            rows = state.rows.filter(
                (row) =>
                    state.selection.selectedRows.has(
                        row.id
                    )
            );
        }

        exportRowsToCsv(
            rows,
            state.columns
        );
    }

    exportXlsx(
        mode:
            | "all"
            | "selected"
            | "visible" = "visible"
    ): void {
        const state = this.store.getState();

        let rows = state.rows;

        if (mode === "selected") {
            rows = state.rows.filter((row) =>
                state.selection.selectedRows.has(row.id)
            );
        }

        exportRowsToXlsx(
            rows,
            state.columns
        );
    }

    undo(): void {
        this.history.undo();
    }

    redo(): void {
        this.history.redo();
    }

    canUndo(): boolean {
        return this.history.canUndo();
    }

    canRedo(): boolean {
        return this.history.canRedo();
    }

    clearHistory(): void {
        this.history.clear();
    }

}
