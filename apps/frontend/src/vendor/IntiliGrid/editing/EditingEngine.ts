import type { StoreApi } from "zustand";

import type { GridRowModel } from "../models";
import type { GridStore } from "../store/createGridStore";

export class EditingEngine<T extends GridRowModel> {
    private readonly store: StoreApi<GridStore<T>>;

    constructor(store: StoreApi<GridStore<T>>) {
        this.store = store;
    }

    startCellEdit(
        rowId: T["id"],
        field: keyof T
    ): void {
        this.store
            .getState()
            .startCellEdit(rowId, field);
    }

    stopCellEdit(): void {
        this.store
            .getState()
            .stopCellEdit();
    }

    updateCellValue(
        rowId: T["id"],
        field: keyof T,
        value: unknown
    ): void {
        this.store
            .getState()
            .updateCellValue(
                rowId,
                field,
                value
            );
    }

    commitCellEdit(
        rowId: T["id"],
        field: keyof T,
        value: unknown
    ): void {
        this.updateCellValue(
            rowId,
            field,
            value
        );

        this.stopCellEdit();
    }

    cancelCellEdit(): void {
        this.stopCellEdit();
    }
}