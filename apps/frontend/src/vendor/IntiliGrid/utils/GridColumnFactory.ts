import type { GridColumn, GridRowModel } from "../models";
import { GRID_SELECTION_FIELD, GRID_SELECTION_WIDTH } from "./GridConstants";

export function createSelectionColumn<T extends GridRowModel>(): GridColumn<T> {
    return {
        field: GRID_SELECTION_FIELD as keyof T,
        headerName: "",
        width: GRID_SELECTION_WIDTH,
        minWidth: GRID_SELECTION_WIDTH,
        maxWidth: GRID_SELECTION_WIDTH,
        sortable: false,
        editable: false,
    };
}

export function buildColumns<T extends GridRowModel>(
    columns: GridColumn<T>[],
    checkboxSelection?: boolean
): GridColumn<T>[] {
    if (!checkboxSelection) {
        return columns;
    }

    return [
        createSelectionColumn<T>(),
        ...columns,
    ];
}