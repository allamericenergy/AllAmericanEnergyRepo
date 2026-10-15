export type GridSelectionMode =
    | "single"
    | "multiple";

export interface GridSelection<
    TId extends string | number
> {
    mode: GridSelectionMode;

    selectedRows: Set<TId>;

    anchor?: TId;
}