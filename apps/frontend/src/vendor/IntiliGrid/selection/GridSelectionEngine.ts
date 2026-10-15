import type { StoreApi } from "zustand";

import type { GridStore } from "../store/createGridStore";
import type { GridRowModel } from "../models";

export class GridSelectionEngine<T extends GridRowModel> {
    private readonly store: StoreApi<GridStore<T>>;

    constructor(store: StoreApi<GridStore<T>>) {
        this.store = store;
    }

    get selectedRows(): Set<T["id"]> {
        return this.store.getState().selection.selectedRows;
    }

    isSelected(id: T["id"]): boolean {
        return this.selectedRows.has(id);
    }

    selectRow(id: T["id"]): void {
        this.store.getState().selectRow(id);
    }

    deselectRow(id: T["id"]): void {
        this.store.getState().deselectRow(id);
    }

    toggleRow(id: T["id"]): void {
        this.store.getState().toggleRow(id);
    }

    clear(): void {
        this.store.getState().clearSelection();
    }

    selectAll(): void {
        const ids = this.store
            .getState()
            .rows
            .map((row) => row.id);

        this.store.getState().selectRows(ids);
    }

    selectRange(
        startId: T["id"],
        endId: T["id"]
    ): void {
        const rows = this.store.getState().rows;

        const startIndex = rows.findIndex(
            (row) => row.id === startId
        );

        const endIndex = rows.findIndex(
            (row) => row.id === endId
        );

        if (startIndex === -1 || endIndex === -1) {
            return;
        }

        const from = Math.min(startIndex, endIndex);
        const to = Math.max(startIndex, endIndex);

        const ids = rows
            .slice(from, to + 1)
            .map((row) => row.id);

        this.store.getState().selectRows(ids);
        this.store.getState().setSelectionAnchor(startId);
    }

    selectRangeTo(endId: T["id"]): void {
        const anchor =
            this.store.getState().selection.anchor;

        if (!anchor) {
            this.selectRow(endId);
            return;
        }

        this.selectRange(anchor, endId);
    }

    getSelectedIds(): T["id"][] {
        return Array.from(this.selectedRows);
    }

    getSelectedRows(): T[] {
        const selected = this.selectedRows;

        return this.store
            .getState()
            .rows
            .filter((row) => selected.has(row.id));
    }
}