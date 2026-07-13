import type { ReactNode } from "react";
import type { GridRowModel } from "./GridRowModel";
import type { GridCellParams } from "./GridCellParams";

export type GridCellEditor =
    | "text"
    | "select";

export type GridSelectOptionValue =
    | string
    | number
    | boolean
    | null;

export type GridSelectOption =
    | GridSelectOptionValue
    | {
          value: GridSelectOptionValue;
          label: string;
      };

export interface GridSelectEditorParams<
    T extends GridRowModel
> {
    values:
        | readonly GridSelectOption[]
        | ((
              params: GridCellParams<T>
          ) => readonly GridSelectOption[]);
}

export interface GridColumn<
    T extends GridRowModel
> {
    field: keyof T;

    headerName: string;

    width?: number;

    minWidth?: number;

    maxWidth?: number;

    flex?: number;

    hidden?: boolean;

    sortable?: boolean;

    sortComparer?: (a: unknown, b: unknown) => number;

    sortComparator?: (
        valueA: unknown,
        valueB: unknown,
        rowA: T,
        rowB: T,
        field: keyof T
    ) => number;

    editable?: boolean;

    cellEditor?: GridCellEditor;

    cellEditorParams?: GridSelectEditorParams<T>;

    resizable?: boolean;

    pinned?: "left" | "right";

    renderCell?: (
        params: GridCellParams<T>
    ) => ReactNode;

    valueFormatter?: (
        value: unknown
    ) => string;
}
