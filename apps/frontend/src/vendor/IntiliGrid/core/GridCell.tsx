import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { GridColumn, GridRowModel } from "../models";

import { useGridStore } from "../store/useGridStore";
import { useGridRuntime } from "../runtime";

import GridCheckboxCell from "../selection/GridCheckboxCell";
import GridEditCell from "../editing/GridEditCell";
import type { GridTreeNodeMeta } from "../hooks/useTreeDataRows";

import {
    GRID_SELECTION_FIELD,
    GRID_SELECTION_WIDTH,
} from "../utils/GridConstants";

import {
    getPinnedLeftColumns,
    getPinnedLeftOffset,
    getPinnedRightColumns,
    getPinnedRightOffset,
} from "../utils/GridPinnedColumns";

interface GridCellProps<T extends GridRowModel> {
    column: GridColumn<T>;
    row: T;
    rowIndex: number;
    treeNode?: GridTreeNodeMeta & { key: string };
    onToggleTreeNode?: (key: string, expanded: boolean) => void;
}

export default function GridCell<T extends GridRowModel>({
    column,
    row,
    rowIndex,
    treeNode,
    onToggleTreeNode,
}: GridCellProps<T>) {
    const runtime = useGridRuntime<T>();

    const columns = useGridStore<T, GridColumn<T>[]>(
        (state) => state.columns
    );

    const editingCell = useGridStore<
        T,
        | {
            rowId: T["id"];
            field: keyof T;
        }
        | undefined
    >((state) => state.editingCell);

    const isSelectionColumn =
        column.field === (GRID_SELECTION_FIELD as keyof T);

    const width = isSelectionColumn
        ? GRID_SELECTION_WIDTH
        : column.width ?? column.minWidth ?? 180;

    const leftPinned =
        getPinnedLeftColumns(columns);

    const rightPinned =
        getPinnedRightColumns(columns);

    const isLastLeftPinned =
        column.pinned === "left" &&
        leftPinned[leftPinned.length - 1]?.field === column.field;

    const isFirstRightPinned =
        column.pinned === "right" &&
        rightPinned[0]?.field === column.field;

    const pinnedSx = {
        position: column.pinned ? "sticky" : "relative",
        left: column.pinned === "left"
            ? getPinnedLeftOffset(columns, column.field)
            : undefined,
        right: column.pinned === "right"
            ? getPinnedRightOffset(columns, column.field)
            : undefined,
        zIndex: column.pinned ? 20 : 1,
        backgroundColor: "inherit",
        boxShadow: isLastLeftPinned
            ? "4px 0 7px -6px rgba(15,23,42,0.32)"
            : isFirstRightPinned
                ? "-4px 0 7px -6px rgba(15,23,42,0.32)"
                : undefined,
    } as const;

    if (isSelectionColumn) {
        return (
            <Box
                sx={{
                    width,
                    minWidth: width,
                    maxWidth: width,
                    flexShrink: 0,
                    boxSizing: "border-box",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRight: 1,
                    borderLeft: column.pinned ? 1 : 0,
                    borderColor: "divider",
                    ...pinnedSx,
                }}
            >
                <GridCheckboxCell<T> row={row} />
            </Box>
        );
    }

    const value = row[column.field];

    const isEditing =
        editingCell?.rowId === row.id &&
        editingCell?.field === column.field;

    if (isEditing) {
        return (
            <Box
                sx={{
                    width,
                    minWidth: width,
                    maxWidth: width,
                    flexShrink: 0,
                    boxSizing: "border-box",
                    px: 1,
                    py: 0.25,
                    display: "flex",
                    alignItems: "center",
                    borderRight: 1,
                    borderLeft: column.pinned ? 1 : 0,
                    borderColor: "divider",
                    overflow: "hidden",
                    ...pinnedSx,
                }}
            >
                <GridEditCell<T>
                    row={row}
                    column={column}
                    value={value}
                />
            </Box>
        );
    }

    const displayText = column.valueFormatter
        ? column.valueFormatter(value)
        : String(value ?? "");
    const cellContent = column.renderCell
        ? column.renderCell({
            value,
            row,
            rowIndex,
        })
        : displayText;
    const textElement = treeNode ? (
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, width: "100%", pl: treeNode.depth * 2 }}>
            {treeNode.hasChildren ? (
                <IconButton
                    size="small"
                    aria-label={treeNode.expanded ? "Collapse row" : "Expand row"}
                    aria-expanded={treeNode.expanded}
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleTreeNode?.(treeNode.key, treeNode.expanded);
                    }}
                    sx={{ p: 0.25, mr: 0.5 }}
                >
                    {treeNode.expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                </IconButton>
            ) : <Box sx={{ width: 25, flexShrink: 0 }} />}
            <Typography
                noWrap
                variant="body2"
                sx={{ color: "text.primary", fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
            >
                {cellContent}
            </Typography>
        </Box>
    ) : (
        <Typography
            noWrap
            variant="body2"
            sx={{
                color: "text.primary",
                fontSize: 13,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
            }}
        >
            {cellContent}
        </Typography>
    );

    return (
        <Box
            sx={{
                width,
                minWidth: width,
                maxWidth: width,
                flexShrink: 0,
                boxSizing: "border-box",
                px: 1.5,
                py: 0.5,
                display: "flex",
                alignItems: "center",
                borderRight: 1,
                borderLeft: column.pinned ? 1 : 0,
                borderColor: "divider",
                overflow: "hidden",
                ...pinnedSx,
            }}
            onDoubleClick={(event) => {
                event.stopPropagation();

                if (column.editable || column.cellEditor) {
                    runtime.startCellEdit(
                        row.id,
                        column.field
                    );
                }
            }}
        >
            {displayText.length > 25 ? (
                <Tooltip title={displayText} arrow>
                    {textElement}
                </Tooltip>
            ) : textElement}
        </Box>
    );
}
