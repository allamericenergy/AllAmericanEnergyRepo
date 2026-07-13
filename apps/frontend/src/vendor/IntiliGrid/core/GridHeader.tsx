import type { MouseEvent } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type {
    GridColumn,
    GridProps,
    GridRowModel,
    GridSortModel,
} from "../models";

import { useGridStore } from "../store/useGridStore";
import { useGridRuntime } from "../runtime";

import GridColumnMenu from "./GridColumnMenu";
import GridCheckboxHeader from "../selection/GridCheckboxHeader";
import GridSortIcon from "./GridSortIcon";

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

interface GridHeaderProps<T extends GridRowModel> {
    props: GridProps<T>;
}

export default function GridHeader<T extends GridRowModel>({
    props,
}: GridHeaderProps<T>) {
    const runtime = useGridRuntime<T>();

    const columns = useGridStore<T, GridColumn<T>[]>(
        (state) => state.columns
    );

    const sortModel = useGridStore<T, GridSortModel<T>>(
        (state) => state.sortModel
    );

    const setColumnWidth = useGridStore<
        T,
        (field: keyof T, width: number) => void
    >((state) => state.setColumnWidth);

    function startResize(
        event: MouseEvent<HTMLDivElement>,
        column: GridColumn<T>
    ): void {
        event.preventDefault();
        event.stopPropagation();

        if (column.resizable === false) {
            return;
        }

        const startX = event.clientX;
        const startWidth =
            column.width ?? column.minWidth ?? 180;

        function handleMove(moveEvent: globalThis.MouseEvent) {
            const delta = moveEvent.clientX - startX;

            const nextWidth = Math.max(
                column.minWidth ?? 80,
                Math.min(
                    startWidth + delta,
                    column.maxWidth ?? 1000
                )
            );

            setColumnWidth(column.field, nextWidth);
        }

        function handleUp() {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        }

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
    }

    return (
        <Box sx={{
            display: "inline-flex",
            minWidth: "max-content",
            width: "max-content",
            backgroundColor: "#f8fafc",
            borderBottom: 1,

            borderColor: "divider",
            userSelect: "none",
            position: "sticky",
            top: 0,
            zIndex: 50,
        }}
        >
            {columns
                .filter((column) => !column.hidden)
                .map((column) => {
                    const isSelectionColumn =
                        column.field ===
                        (GRID_SELECTION_FIELD as keyof T);

                    const width = isSelectionColumn
                        ? GRID_SELECTION_WIDTH
                        : column.width ?? column.minWidth ?? 180;

                    const leftPinned =
                        getPinnedLeftColumns(columns);

                    const rightPinned =
                        getPinnedRightColumns(columns);

                    const isLastLeftPinned =
                        column.pinned === "left" &&
                        leftPinned[leftPinned.length - 1]?.field ===
                        column.field;

                    const isFirstRightPinned =
                        column.pinned === "right" &&
                        rightPinned[0]?.field === column.field;

                    const pinnedSx = {
                        position: column.pinned ? "sticky" : "relative",
                        left:
                            column.pinned === "left"
                                ? getPinnedLeftOffset(columns, column.field)
                                : undefined,
                        right:
                            column.pinned === "right"
                                ? getPinnedRightOffset(columns, column.field)
                                : undefined,
                        zIndex: column.pinned ? 60 : 1,
                        backgroundColor: "#f8fafc",
                        boxShadow: isLastLeftPinned
                            ? "4px 0 8px -6px rgba(15,23,42,0.35)"
                            : isFirstRightPinned
                                ? "-6px 0 8px -7px rgba(15,23,42,0.35)"
                                : undefined,
                    } as const;

                    if (isSelectionColumn) {
                        return (
                            <Box
                                key={String(column.field)}
                                sx={{
                                    width,
                                    minWidth: width,
                                    maxWidth: width,
                                    flexShrink: 0,
                                    boxSizing: "border-box",
                                    height: 42,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRight: 1,
                                    borderLeft: column.pinned ? 1 : 0,
                                    borderColor: "divider",
                                    ...pinnedSx,
                                }}
                            >
                                <GridCheckboxHeader<T> />
                            </Box>
                        );
                    }

                    const sortable =
                        column.sortable !== false;

                    const resizable =
                        column.resizable !== false;

                    const activeSortIndex =
                        sortModel.findIndex(
                            (item) => item.field === column.field
                        );
                    const activeSort =
                        activeSortIndex >= 0
                            ? sortModel[activeSortIndex]
                            : undefined;

                    return (
                        <Box
                            key={String(column.field)}
                            onClick={(event) => {
                                if (!sortable) {
                                    return;
                                }

                                runtime.toggleSorting(
                                    column.field,
                                    {
                                        multi: event.shiftKey,
                                        sortOrder: props.sortOrder,
                                    }
                                );
                            }}
                            sx={{
                                width,
                                minWidth: width,
                                maxWidth: width,
                                flexShrink: 0,
                                boxSizing: "border-box",
                                height: 42,
                                px: 1.5,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderRight: 1,
                                borderLeft: column.pinned ? 1 : 0,
                                borderColor: "divider",
                                cursor: sortable
                                    ? "pointer"
                                    : "default",
                                "&:hover": {
                                    backgroundColor: sortable
                                        ? "#eef4ff"
                                        : "#f8fafc",
                                },
                                ...pinnedSx,
                            }}
                        >
                            <Typography
                                variant="body2"
                                noWrap
                                sx={{
                                    fontWeight: 700,
                                    color: "text.secondary",
                                    fontSize: 12,
                                    letterSpacing: 0.2,
                                    flex: 1,
                                }}
                            >
                                {column.headerName}
                            </Typography>

                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    flexShrink: 0,
                                    boxSizing: "border-box",
                                    gap: 0.5,
                                }}
                            >
                                {sortable && (
                                    <GridSortIcon
                                        direction={
                                            activeSort?.direction ?? null
                                        }
                                    />
                                )}

                                {activeSort &&
                                    sortModel.length > 1 && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontWeight: 700,
                                                minWidth: 16,
                                                textAlign: "center",
                                            }}
                                        >
                                            {activeSortIndex + 1}
                                        </Typography>
                                    )}

                                <GridColumnMenu<T> column={column} />
                            </Box>

                            {resizable && (
                                <Box
                                    onMouseDown={(event) =>
                                        startResize(event, column)
                                    }
                                    sx={{
                                        position: "absolute",
                                        top: 0,
                                        right: 0,
                                        width: 6,
                                        flexShrink: 0,
                                        boxSizing: "border-box",
                                        height: "100%",
                                        cursor: "col-resize",
                                        zIndex: 10,
                                        "&:hover": {
                                            backgroundColor:
                                                "primary.main",
                                        },
                                    }}
                                />
                            )}
                        </Box>
                    );
                })}
        </Box>
    );
}
