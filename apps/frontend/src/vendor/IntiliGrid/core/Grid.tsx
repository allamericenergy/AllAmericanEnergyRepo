import { useMemo, useRef, useEffect } from "react";

import Paper from "@mui/material/Paper";
import { ThemeProvider } from "@mui/material/styles";

import type { StoreApi } from "zustand";

import type { GridProps, GridRowModel } from "../models";
import type { GridStore } from "../store/createGridStore";

import { createGridStore } from "../store/createGridStore";
import GridProvider from "../store/GridProvider";

import { GridRuntime, GridRuntimeContext } from "../runtime";

import { buildGridApi, GridApiProvider } from "../api";

import {
    createGridServices,
    GridServicesProvider,
} from "../services";

import GridViewport from "./GridViewport";
import GridFooter from "../footer/GridFooter";
import { GridToolbar } from "../toolbar";
import { IntiliGridTheme } from "../styles/GridTheme";

export default function Grid<T extends GridRowModel>(
    props: GridProps<T>
) {
    const storeRef =
        useRef<StoreApi<GridStore<T>> | null>(null);

    if (!storeRef.current) {
        storeRef.current = createGridStore<T>();
    }

    const store = storeRef.current;

    const runtime = useMemo(
        () => new GridRuntime<T>(store),
        [store]
    );

    const api = useMemo(
        () => buildGridApi(runtime),
        [runtime]
    );

    const services = useMemo(
        () => createGridServices(runtime),
        [runtime]
    );

    const lastSelectionRef =
        useRef<string>("");

    const lastSortRef = useRef<string>("");

    useEffect(() => {
        if (!props.onSelectionChange) {
            return;
        }

        const unsubscribe = store.subscribe((state) => {
            const selectedIds = Array.from(
                state.selection.selectedRows
            );

            const signature =
                selectedIds.join("|");

            if (signature === lastSelectionRef.current) {
                return;
            }

            lastSelectionRef.current = signature;

            props.onSelectionChange?.(
                selectedIds,
                state.rows.filter((row) =>
                    state.selection.selectedRows.has(row.id)
                )
            );
        });

        return unsubscribe;
    }, [store, props.onSelectionChange]);

    useEffect(() => {
        if (
            !props.onSortChange &&
            !props.onSortModelChange
        ) {
            return;
        }

        const unsubscribe = store.subscribe((state) => {
            const signature = state.sortModel
                .map(
                    (item) =>
                        `${String(item.field)}:${item.direction}`
                )
                .join("|");

            if (signature === lastSortRef.current) {
                return;
            }

            lastSortRef.current = signature;

            props.onSortChange?.(state.sorting);
            props.onSortModelChange?.(state.sortModel);
        });

        return unsubscribe;
    }, [
        store,
        props.onSortChange,
        props.onSortModelChange,
    ]);

    const lastRowsRef = useRef<T[]>([]);

    useEffect(() => {
        lastRowsRef.current = store.getState().rows;
    }, [store]);

    useEffect(() => {
        if (!props.onCellEdit) {
            return;
        }

        const unsubscribe = store.subscribe((state) => {
            const previousRows = lastRowsRef.current;
            const currentRows = state.rows;

            for (const currentRow of currentRows) {
                const previousRow = previousRows.find(
                    (row) => row.id === currentRow.id
                );

                if (!previousRow) {
                    continue;
                }

                for (const key of Object.keys(currentRow) as Array<keyof T>) {
                    if (currentRow[key] !== previousRow[key]) {
                        props.onCellEdit?.(
                            currentRow.id,
                            key,
                            currentRow[key],
                            currentRow
                        );

                        lastRowsRef.current = currentRows;
                        return;
                    }
                }
            }

            lastRowsRef.current = currentRows;
        });

        return unsubscribe;
    }, [store, props.onCellEdit]);


    return (
        <ThemeProvider theme={IntiliGridTheme}>
            <GridRuntimeContext.Provider value={runtime}>
                <GridProvider store={store} props={props}>
                    <GridServicesProvider services={services}>
                        <GridApiProvider api={api}>
                            <Paper
                                elevation={0}
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    width: "100%",
                                    height: "100%",
                                    minHeight: 0,
                                    overflow: "hidden",
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: "divider",
                                    backgroundColor: "background.paper",
                                    color: "text.primary",
                                    fontFamily:
                                        IntiliGridTheme.typography.fontFamily,
                                    boxShadow:
                                        "0 1px 2px rgba(15, 23, 42, 0.06)",
                                }}
                            >
                                <GridToolbar<T> />
                                <GridViewport<T> props={props} />
                                <GridFooter<T> />
                            </Paper>
                        </GridApiProvider>
                    </GridServicesProvider>
                </GridProvider>
            </GridRuntimeContext.Provider>
        </ThemeProvider>
    );
}
