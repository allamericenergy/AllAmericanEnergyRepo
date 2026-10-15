import type { GridRowModel } from "../models";
import type { GridRuntime } from "../runtime";
import type { GridApi } from "./GridApi";

export function buildGridApi<T extends GridRowModel>(
    runtime: GridRuntime<T>
): GridApi<T> {
    return {
        getRows() {
            return runtime.getRows();
        },

        getSelectedRows() {
            return runtime.getSelectedRows();
        },

        getSelectedIds() {
            return runtime.getSelectedIds();
        },

        selectRow(id) {
            runtime.selectRow(id);
        },

        deselectRow(id) {
            runtime.deselectRow(id);
        },

        toggleRow(id) {
            runtime.toggleRow(id);
        },

        selectAll() {
            runtime.selectAll();
        },

        selectRange(startId, endId) {
            runtime.selectRange(startId, endId);
        },

        selectRangeTo(endId) {
            runtime.selectRangeTo(endId);
        },

        clearSelection() {
            runtime.clearSelection();
        },

        sort(field, direction) {
            runtime.sort(field, direction);
        },

        clearSorting() {
            runtime.clearSorting();
        },

        setSortModel(sortModel) {
            runtime.setSortModel(sortModel);
        },

        getSortModel() {
            return runtime.getSortModel();
        },

        hideColumn(field) {
            runtime.hideColumn(field);
        },

        showColumn(field) {
            runtime.showColumn(field);
        },

        toggleColumnVisibility(field) {
            runtime.toggleColumnVisibility(field);
        },

        refresh() {
            runtime.refresh();
        },

        setQuickFilter(value) {
            runtime.setQuickFilter(value);
        },

        clearQuickFilter() {
            runtime.clearQuickFilter();
        },

        getQuickFilter() {
            return runtime.getQuickFilter();
        },

        setPage(page) {
            runtime.setPage(page);
        },

        setPageSize(pageSize) {
            runtime.setPageSize(pageSize);
        },

        nextPage() {
            runtime.nextPage();
        },

        previousPage() {
            runtime.previousPage();
        },

        firstPage() {
            runtime.firstPage();
        },

        lastPage() {
            runtime.lastPage();
        },

        getPage() {
            return runtime.getPage();
        },

        getPageSize() {
            return runtime.getPageSize();
        },

        pinColumn(field, side) {
            runtime.pinColumn(field, side);
        },

        unpinColumn(field) {
            runtime.unpinColumn(field);
        },

        exportCsv(mode = "visible") {
            runtime.exportCsv(mode);
        },

        undo() {
            runtime.undo();
        },

        redo() {
            runtime.redo();
        },

        canUndo() {
            return runtime.canUndo();
        },

        canRedo() {
            return runtime.canRedo();
        },

        clearHistory() {
            runtime.clearHistory();
        },
    };
}
