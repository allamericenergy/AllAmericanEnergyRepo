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

    /** Preserve zero-prefixed numeric text when a CSV is opened in Excel. */
    csvPreserveLeadingZeros?: boolean;

    /** Always export digit-only values as text so Excel shows the full number (no 1.2E+11 or rounding). */
    exportAsText?: boolean;

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

    /** Value written to CSV/XLSX exports. Defaults to valueFormatter, then the raw field value. */
    exportValue?: (
        row: T,
        value: unknown
    ) => unknown;

    /** Leave this column out of CSV/XLSX exports (e.g. action buttons). */
    excludeFromExport?: boolean;
}
