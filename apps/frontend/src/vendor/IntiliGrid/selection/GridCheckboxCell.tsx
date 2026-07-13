import Checkbox from "@mui/material/Checkbox";

import { useGridRuntime } from "../runtime";
import type { GridRowModel } from "../models";

interface GridCheckboxCellProps<T extends GridRowModel> {
    row: T;
}

export default function GridCheckboxCell<T extends GridRowModel>({
    row,
}: GridCheckboxCellProps<T>) {
    const runtime = useGridRuntime<T>();

    return (
        <Checkbox
            size="small"
            checked={runtime.isRowSelected(row.id)}
            onClick={(event) => {
                event.stopPropagation();
            }}
            onChange={() => {
                runtime.toggleRow(row.id);
            }}
        />
    );
}