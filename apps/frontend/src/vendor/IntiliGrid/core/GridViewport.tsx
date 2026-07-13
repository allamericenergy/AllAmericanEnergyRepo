import type { KeyboardEvent } from "react";

import Box from "@mui/material/Box";

import type { GridProps, GridRowModel } from "../models";

import { useGridRuntime } from "../runtime";
import { useGridStore } from "../store/useGridStore";
import { useSortedRows } from "../hooks/useSortedRows";
import { useFilteredRows } from "../hooks/useFilteredRows";
import { usePaginatedRows } from "../hooks/usePaginatedRows";
import { useGridVirtualizer } from "../virtualization";
import GridHeader from "./GridHeader";

import GridBody from "./GridBody";
import GridLoading from "../overlays/GridLoading";

interface GridViewportProps<T extends GridRowModel> {
    props: GridProps<T>;
}

export default function GridViewport<T extends GridRowModel>({
    props,
}: GridViewportProps<T>) {
    const runtime = useGridRuntime<T>();
    const rowModelType =
        props.rowModelType ?? "clientSide";
    const loading = useGridStore<T, boolean>(
        (state) => state.loading
    );

    const sortedRows = useSortedRows<T>(
        rowModelType === "serverSide"
            ? "server"
            : props.sortingMode
    );

    const filteredRows =
        useFilteredRows<T>(sortedRows, rowModelType);

    const rows =
        usePaginatedRows<T>(filteredRows, rowModelType);

    const {
        containerRef,
        handleScroll,
        range,
        rowHeight,
        scrollToIndex,
    } = useGridVirtualizer({
        rowCount: rows.length,
        rowHeight: 38,
        overscan: 10,
    });

    function focusRowAtIndex(
        index: number,
        extendSelection: boolean
    ) {
        if (rows.length === 0) {
            return;
        }

        const safeIndex = Math.max(
            0,
            Math.min(index, rows.length - 1)
        );

        const row = rows[safeIndex];

        runtime.focusRow(row.id);

        if (extendSelection) {
            runtime.selectRangeTo(row.id);
        }

        scrollToIndex(safeIndex);
    }

    function focusRowByOffset(
        offset: number,
        extendSelection: boolean
    ) {
        const focusedId =
            runtime.getFocusedRowId();

        const currentIndex =
            focusedId === undefined
                ? -1
                : rows.findIndex(
                      (row) => row.id === focusedId
                  );

        focusRowAtIndex(
            currentIndex + offset,
            extendSelection
        );
    }

    function handleKeyDown(
        event: KeyboardEvent<HTMLDivElement>
    ) {
        const key = event.key.toLowerCase();

        if (event.ctrlKey && key === "z") {
            event.preventDefault();
            runtime.undo();
            return;
        }

        if (event.ctrlKey && key === "y") {
            event.preventDefault();
            runtime.redo();
            return;
        }

        if (event.ctrlKey && key === "a") {
            event.preventDefault();
            runtime.selectAll();
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            focusRowByOffset(1, event.shiftKey);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            focusRowByOffset(-1, event.shiftKey);
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            focusRowAtIndex(0, event.shiftKey);
            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            focusRowAtIndex(
                rows.length - 1,
                event.shiftKey
            );
            return;
        }

        if (
            event.key === " " ||
            event.key === "Enter"
        ) {
            event.preventDefault();

            const focusedId =
                runtime.getFocusedRowId();

            if (focusedId !== undefined) {
                runtime.toggleRow(focusedId);
            }
        }
    }

    return (
        <Box
            ref={containerRef}
            tabIndex={0}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            sx={{
                flex: 1,
                overflow: "auto",
                position: "relative",
                outline: "none",
                backgroundColor: "background.paper",
            }}
        >
            <GridHeader<T> props={props} />
            {loading && <GridLoading />}
            <Box
                sx={{
                    height: range.totalHeight,
                    position: "relative",
                    display: loading ? "none" : "block",
                }}
            >
                <Box
                    sx={{
                        transform: `translateY(${range.offsetTop}px)`,
                    }}
                >
                    <GridBody<T>
                        props={props}
                        rows={rows.slice(
                            range.startIndex,
                            range.endIndex + 1
                        )}
                        rowOffset={range.startIndex}
                        rowHeight={rowHeight}
                    />
                </Box>
            </Box>
        </Box>
    );
}
