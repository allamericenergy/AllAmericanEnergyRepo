import type { StoreApi } from "zustand";

import type { GridStore } from "../store/createGridStore";
import type {
    GridColumn,
    GridRowModel,
    GridSort,
    GridSortDirection,
    GridSortModel,
    GridSortOrder,
} from "../models";

export class SortingEngine<T extends GridRowModel> {
    private readonly store: StoreApi<GridStore<T>>;




    constructor(store: StoreApi<GridStore<T>>) {
        this.store = store;
    }

    get field(): keyof T | undefined {
        return this.store.getState().sorting.field;
    }

    get direction(): "asc" | "desc" | null {
        return this.store.getState().sorting.direction;
    }

    get isSorted(): boolean {
        return this.direction !== null;
    }

    sort(field: keyof T, direction: "asc" | "desc"): void {
        this.store.getState().setSorting(field, direction);
    }

    setSortModel(sortModel: GridSortModel<T>): void {
        this.store.getState().setSortModel(sortModel);
    }

    clear(): void {
        this.store.getState().clearSorting();
    }

    toggle(
        field: keyof T,
        options: {
            multi?: boolean;
            sortOrder?: GridSortOrder;
        } = {}
    ): void {
        const state = this.store.getState();
        const sortOrder =
            options.sortOrder ?? ["asc", "desc", null];
        const currentModel = state.sortModel;
        const currentIndex = currentModel.findIndex(
            (item) => item.field === field
        );
        const currentDirection =
            currentIndex >= 0
                ? currentModel[currentIndex].direction
                : null;
        const nextDirection =
            getNextSortDirection(
                currentDirection,
                sortOrder
            );

        if (!options.multi) {
            if (!nextDirection) {
                state.clearSorting();
                return;
            }

            state.setSortModel([
                {
                    field,
                    direction: nextDirection,
                },
            ]);
            return;
        }

        const nextModel = currentModel.filter(
            (item) => item.field !== field
        );

        if (nextDirection) {
            nextModel.splice(
                currentIndex >= 0
                    ? currentIndex
                    : nextModel.length,
                0,
                {
                    field,
                    direction: nextDirection,
                }
            );
        }

        state.setSortModel(nextModel);
    }

    isSortedBy(field: keyof T): boolean {
        return this.field === field;
    }

    getState(): GridSort<T> {
        return this.store.getState().sorting;
    }

    getSortModel(): GridSortModel<T> {
        return this.store.getState().sortModel;
    }
}

function getNextSortDirection(
    currentDirection: GridSortDirection,
    sortOrder: GridSortOrder
): Exclude<GridSortDirection, null> | null {
    const normalizedOrder: GridSortOrder =
        sortOrder.length > 0
            ? sortOrder
            : ["asc", "desc", null];
    const currentIndex =
        normalizedOrder.indexOf(currentDirection);
    const nextIndex =
        currentIndex >= 0
            ? (currentIndex + 1) % normalizedOrder.length
            : 0;

    return normalizedOrder[nextIndex] ?? null;
}

function compareValues(a: unknown, b: unknown): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    if (typeof a === "number" && typeof b === "number") {
        return a - b;
    }

    if (typeof a === "boolean" && typeof b === "boolean") {
        return Number(a) - Number(b);
    }

    if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime();
    }

    return String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

export function sortRows<T extends GridRowModel>(
    rows: T[],
    field: keyof T,
    direction: "asc" | "desc",
    column?: GridColumn<T>
): T[] {
    return [...rows].sort((a, b) => {
        const valueA = a[field];
        const valueB = b[field];

        const result = column?.sortComparator
            ? column.sortComparator(
                  valueA,
                  valueB,
                  a,
                  b,
                  field
              )
            : column?.sortComparer
            ? column.sortComparer(valueA, valueB)
            : compareValues(valueA, valueB);

        return direction === "asc" ? result : -result;
    });
}

export function sortRowsByModel<T extends GridRowModel>(
    rows: T[],
    sortModel: GridSortModel<T>,
    columns: GridColumn<T>[]
): T[] {
    if (sortModel.length === 0) {
        return rows;
    }

    return [...rows].sort((a, b) => {
        for (const sortItem of sortModel) {
            const column = columns.find(
                (item) => item.field === sortItem.field
            );
            const valueA = a[sortItem.field];
            const valueB = b[sortItem.field];
            const result = column?.sortComparator
                ? column.sortComparator(
                      valueA,
                      valueB,
                      a,
                      b,
                      sortItem.field
                  )
                : column?.sortComparer
                ? column.sortComparer(valueA, valueB)
                : compareValues(valueA, valueB);

            if (result !== 0) {
                return sortItem.direction === "asc"
                    ? result
                    : -result;
            }
        }

        return 0;
    });
}
