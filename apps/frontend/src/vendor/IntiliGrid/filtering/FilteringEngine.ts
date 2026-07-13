import type { StoreApi } from "zustand";

import type {
    GridColumn,
    GridRowModel,
} from "../models";

import type { GridStore } from "../store/createGridStore";

export class FilteringEngine<T extends GridRowModel> {
    private readonly store: StoreApi<GridStore<T>>;

    constructor(store: StoreApi<GridStore<T>>) {
        this.store = store;
    }

    get quickFilter(): string {
        return this.store.getState().quickFilter;
    }

    setQuickFilter(value: string): void {
        this.store.getState().setQuickFilter(value);
    }

    clearQuickFilter(): void {
        this.store.getState().clearQuickFilter();
    }

    applyQuickFilter(
        rows: T[],
        columns: GridColumn<T>[]
    ): T[] {
        const query =
            this.quickFilter.trim().toLowerCase();

        if (!query) {
            return rows;
        }

        const visibleColumns =
            columns.filter((column) => !column.hidden);

        return rows.filter((row) =>
            visibleColumns.some((column) => {
                const value = row[column.field];

                return String(value ?? "")
                    .toLowerCase()
                    .includes(query);
            })
        );
    }
}