import type { GridRowModel } from "./GridRowModel";

export interface GridCellParams<
    T extends GridRowModel,
    V = unknown
> {
    value: V;
    row: T;
    rowIndex: number;
}