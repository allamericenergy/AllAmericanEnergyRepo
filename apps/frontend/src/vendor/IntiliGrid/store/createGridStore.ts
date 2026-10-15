import { createStore } from "zustand/vanilla";

import type {
    GridRowModel,
    GridState,
} from "../models";

import type { GridActions } from "./GridActions";

export type GridStore<T extends GridRowModel> =
    GridState<T> &
    GridActions<T>;

export function createGridStore<T extends GridRowModel>() {
    return createStore<GridStore<T>>()((set) => ({
        rows: [],
        rowCount: 0,
        columns: [],
        loading: false,

        focusedRowId: undefined,
        quickFilter: "",
        editingCell: undefined,

        history: {
            past: [],
            future: [],
        },

        pagination: {
            page: 0,
            pageSize: 25,
        },

        sorting: {
            field: undefined,
            direction: null,
        },

        sortModel: [],

        selection: {
            mode: "multiple",
            selectedRows: new Set<T["id"]>(),
            anchor: undefined,
        },

        setRows(rows) {
            set({
                rows: [...rows],
                rowCount: rows.length,
            });
        },

        setRowCount(rowCount) {
            set({
                rowCount: Math.max(0, rowCount),
            });
        },

        setColumns(columns) {
            set({
                columns: [...columns],
            });
        },

        setColumnWidth(field, width) {
            set((state) => ({
                columns: state.columns.map((column) =>
                    column.field === field
                        ? {
                              ...column,
                              width,
                          }
                        : column
                ),
            }));
        },

        hideColumn(field) {
            set((state) => ({
                columns: state.columns.map((column) =>
                    column.field === field
                        ? {
                              ...column,
                              hidden: true,
                          }
                        : column
                ),
            }));
        },

        showColumn(field) {
            set((state) => ({
                columns: state.columns.map((column) =>
                    column.field === field
                        ? {
                              ...column,
                              hidden: false,
                          }
                        : column
                ),
            }));
        },

        toggleColumnVisibility(field) {
            set((state) => ({
                columns: state.columns.map((column) =>
                    column.field === field
                        ? {
                              ...column,
                              hidden: !column.hidden,
                          }
                        : column
                ),
            }));
        },

        pinColumn(field, side) {
            set((state) => ({
                columns: state.columns.map((column) =>
                    column.field === field
                        ? {
                              ...column,
                              pinned: side,
                          }
                        : column
                ),
            }));
        },

        unpinColumn(field) {
            set((state) => ({
                columns: state.columns.map((column) =>
                    column.field === field
                        ? {
                              ...column,
                              pinned: undefined,
                          }
                        : column
                ),
            }));
        },

        setLoading(value) {
            set({
                loading: value,
            });
        },

        setSorting(field, direction) {
            const nextDirection = direction ?? null;

            set({
                sorting: {
                    field,
                    direction: nextDirection,
                },
                sortModel:
                    field && nextDirection
                        ? [{
                              field,
                              direction: nextDirection,
                          }]
                        : [],
            });
        },

        setSortModel(sortModel) {
            const nextModel = [...sortModel];
            const firstSort = nextModel[0];

            set({
                sortModel: nextModel,
                sorting: {
                    field: firstSort?.field,
                    direction: firstSort?.direction ?? null,
                },
            });
        },

        clearSorting() {
            set({
                sorting: {
                    field: undefined,
                    direction: null,
                },
                sortModel: [],
            });
        },

        selectRow(id) {
            set((state) => ({
                selection: {
                    ...state.selection,
                    selectedRows: new Set([
                        ...state.selection.selectedRows,
                        id,
                    ]),
                    anchor: id,
                },
            }));
        },

        deselectRow(id) {
            set((state) => {
                const selectedRows =
                    new Set(state.selection.selectedRows);

                selectedRows.delete(id);

                return {
                    selection: {
                        ...state.selection,
                        selectedRows,
                    },
                };
            });
        },

        toggleRow(id) {
            set((state) => {
                const selectedRows =
                    new Set(state.selection.selectedRows);

                if (selectedRows.has(id)) {
                    selectedRows.delete(id);
                } else {
                    selectedRows.add(id);
                }

                return {
                    selection: {
                        ...state.selection,
                        selectedRows,
                        anchor: id,
                    },
                };
            });
        },

        selectRows(ids) {
            set((state) => ({
                selection: {
                    ...state.selection,
                    selectedRows: new Set(ids),
                },
            }));
        },

        clearSelection() {
            set((state) => ({
                selection: {
                    ...state.selection,
                    selectedRows: new Set<T["id"]>(),
                    anchor: undefined,
                },
            }));
        },

        setSelectionAnchor(id) {
            set((state) => ({
                selection: {
                    ...state.selection,
                    anchor: id,
                },
            }));
        },

        setFocusedRow(id) {
            set({
                focusedRowId: id,
            });
        },

        clearFocusedRow() {
            set({
                focusedRowId: undefined,
            });
        },

        setQuickFilter(value) {
            set({
                quickFilter: value,
            });
        },

        clearQuickFilter() {
            set({
                quickFilter: "",
            });
        },

        setPage(page) {
            set((state) => ({
                pagination: {
                    ...state.pagination,
                    page: Math.max(0, page),
                },
            }));
        },

        setPageSize(pageSize) {
            set({
                pagination: {
                    page: 0,
                    pageSize,
                },
            });
        },

        nextPage() {
            set((state) => ({
                pagination: {
                    ...state.pagination,
                    page: state.pagination.page + 1,
                },
            }));
        },

        previousPage() {
            set((state) => ({
                pagination: {
                    ...state.pagination,
                    page: Math.max(
                        0,
                        state.pagination.page - 1
                    ),
                },
            }));
        },

        firstPage() {
            set((state) => ({
                pagination: {
                    ...state.pagination,
                    page: 0,
                },
            }));
        },

        lastPage() {
            set((state) => {
                const totalPages = Math.max(
                    1,
                    Math.ceil(
                        state.rowCount /
                            state.pagination.pageSize
                    )
                );

                return {
                    pagination: {
                        ...state.pagination,
                        page: totalPages - 1,
                    },
                };
            });
        },

        startCellEdit(rowId, field) {
            set({
                editingCell: {
                    rowId,
                    field,
                },
            });
        },

        stopCellEdit() {
            set({
                editingCell: undefined,
            });
        },

        updateCellValue(rowId, field, value) {
            set((state) => {
                const nextRows = state.rows.map((row) =>
                    row.id === rowId
                        ? {
                              ...row,
                              [field]: value,
                          }
                        : row
                );

                return {
                    rows: nextRows,
                    history: {
                        past: [
                            ...state.history.past,
                            state.rows,
                        ],
                        future: [],
                    },
                };
            });
        },

        undo() {
            set((state) => {
                const previous =
                    state.history.past[
                        state.history.past.length - 1
                    ];

                if (!previous) {
                    return state;
                }

                return {
                    rows: previous,
                    history: {
                        past: state.history.past.slice(
                            0,
                            -1
                        ),
                        future: [
                            state.rows,
                            ...state.history.future,
                        ],
                    },
                };
            });
        },

        redo() {
            set((state) => {
                const next =
                    state.history.future[0];

                if (!next) {
                    return state;
                }

                return {
                    rows: next,
                    history: {
                        past: [
                            ...state.history.past,
                            state.rows,
                        ],
                        future:
                            state.history.future.slice(1),
                    },
                };
            });
        },

        clearHistory() {
            set({
                history: {
                    past: [],
                    future: [],
                },
            });
        },
    }));
}
