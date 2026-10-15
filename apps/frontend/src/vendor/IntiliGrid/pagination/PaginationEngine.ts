import type { StoreApi } from "zustand";

import type { GridRowModel } from "../models";
import type { GridStore } from "../store/createGridStore";

export class PaginationEngine<T extends GridRowModel> {
    private readonly store: StoreApi<GridStore<T>>;

    constructor(store: StoreApi<GridStore<T>>) {
        this.store = store;
    }

    get page(): number {
        return this.store.getState().pagination.page;
    }

    get pageSize(): number {
        return this.store.getState().pagination.pageSize;
    }

    setPage(page: number): void {
        this.store.getState().setPage(page);
    }

    setPageSize(pageSize: number): void {
        this.store.getState().setPageSize(pageSize);
    }

    nextPage(): void {
        this.store.getState().nextPage();
    }

    previousPage(): void {
        this.store.getState().previousPage();
    }

    firstPage(): void {
        this.store.getState().firstPage();
    }

    lastPage(): void {
        this.store.getState().lastPage();
    }

    paginateRows(rows: T[]): T[] {
        const start = this.page * this.pageSize;
        const end = start + this.pageSize;

        return rows.slice(start, end);
    }
}