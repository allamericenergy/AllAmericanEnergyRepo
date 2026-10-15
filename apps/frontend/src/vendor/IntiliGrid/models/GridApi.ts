import type { GridRowModel } from "./GridRowModel";

export interface GridApi<
    T extends GridRowModel
> {
    getRows(): T[];

    getSelectedRows(): T[];

    getSelectedIds(): T["id"][];

    selectAll(): void;

    clearSelection(): void;

    sort(
        field: keyof T,
        direction: "asc" | "desc"
    ): void;

    clearSorting(): void;
}