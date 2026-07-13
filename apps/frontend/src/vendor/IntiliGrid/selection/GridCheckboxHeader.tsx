import Checkbox from "@mui/material/Checkbox";

import { useGridStore } from "../store/useGridStore";
import { useGridRuntime } from "../runtime";
import type { GridRowModel } from "../models";

export default function GridCheckboxHeader<T extends GridRowModel>() {
    const runtime = useGridRuntime<T>();

    const rows = useGridStore<T, T[]>(
        (state) => state.rows
    );

    const selectedRows = useGridStore<T, Set<T["id"]>>(
        (state) => state.selection.selectedRows
    );

    const allSelected =
        rows.length > 0 &&
        rows.every((row) =>
            selectedRows.has(row.id)
        );

    const indeterminate =
        selectedRows.size > 0 &&
        !allSelected;

    return (
        <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={indeterminate}
            onChange={() => {
                if (allSelected) {
                    runtime.clearSelection();
                } else {
                    runtime.selectAll();
                }
            }}
        />
    );
}