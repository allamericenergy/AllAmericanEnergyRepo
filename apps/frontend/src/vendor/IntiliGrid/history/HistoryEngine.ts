import type { StoreApi } from "zustand";

import type { GridRowModel } from "../models";
import type { GridStore } from "../store/createGridStore";

export class HistoryEngine<T extends GridRowModel> {
    private readonly store: StoreApi<GridStore<T>>;

    constructor(store: StoreApi<GridStore<T>>) {
        this.store = store;
    }

    undo(): void {
        this.store.getState().undo();
    }

    redo(): void {
        this.store.getState().redo();
    }

    clear(): void {
        this.store.getState().clearHistory();
    }

    canUndo(): boolean {
        return this.store.getState().history.past.length > 0;
    }

    canRedo(): boolean {
        return this.store.getState().history.future.length > 0;
    }
}