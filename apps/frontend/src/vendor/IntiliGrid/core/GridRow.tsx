import Box from "@mui/material/Box";

import type { GridColumn, GridRowModel } from "../models";

import { useGridStore } from "../store/useGridStore";
import { useGridRuntime } from "../runtime";

import GridCell from "./GridCell";
import type { GridTreeNodeMeta } from "../hooks/useTreeDataRows";
interface GridRowProps<T extends GridRowModel> {
    row: T;
    rowIndex: number;
    rowHeight?: number;
    onRowClick?: (row: T) => void;
    treeNode?: GridTreeNodeMeta & { key: string };
    treeDataColumnField?: keyof T;
    onToggleTreeNode?: (key: string, expanded: boolean) => void;
}

export default function GridRow<T extends GridRowModel>({
    row,
    rowIndex,
    rowHeight = 38,
    onRowClick,
    treeNode,
    treeDataColumnField,
    onToggleTreeNode,
}: GridRowProps<T>) {
    const runtime = useGridRuntime<T>();

    const columns = useGridStore<T, GridColumn<T>[]>(
        (state) => state.columns
    );

    const selectedRows = useGridStore<T, Set<T["id"]>>(
        (state) => state.selection.selectedRows
    );

    const focusedRowId = useGridStore<
        T,
        T["id"] | undefined
    >((state) => state.focusedRowId);

    const isSelected = selectedRows.has(row.id);

    const isFocused = focusedRowId === row.id;

    return (
        <Box
            onClick={(event) => {
                runtime.focusRow(row.id);

                if (event.shiftKey) {
                    runtime.selectRangeTo(row.id);
                } else if (event.ctrlKey || event.metaKey) {
                    runtime.toggleRow(row.id);
                } else {
                    runtime.clearSelection();
                    runtime.selectRow(row.id);
                }

                onRowClick?.(row);
            }}
            sx={{
                display: "flex",
                height: rowHeight,
                minHeight: rowHeight,
                width: "max-content",
                minWidth: "max-content",
                flexShrink: 0,
                boxSizing: "border-box",
                borderBottom: 1,
                borderColor: "divider",
                cursor: "pointer",
                backgroundColor: isSelected
                    ? "#dceafe"
                    : rowIndex % 2 === 0
                        ? "background.paper"
                        : "#fbfdff",
                outline: isFocused ? "1px solid" : "none",
                outlineColor: isFocused
                    ? "primary.main"
                    : "transparent",
                outlineOffset: -2,
                "&:hover": {
                    backgroundColor: isSelected
                        ? "#cfe1ff"
                        : "#f1f6ff",
                },
            }}
        >
            {columns
                .filter((column) => !column.hidden)
                .map((column) => (
                    <GridCell<T>
                        key={String(column.field)}
                        column={column}
                        row={row}
                        rowIndex={rowIndex}
                        treeNode={column.field === treeDataColumnField ? treeNode : undefined}
                        onToggleTreeNode={onToggleTreeNode}
                    />
                ))}
        </Box>
    );
}
