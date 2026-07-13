import {
    createContext,
    useContext,
    useEffect,
    useRef,
    type ReactNode,
} from "react";

import type { StoreApi } from "zustand";
import { useStore } from "zustand";

import type {
    GridProps,
    GridRowModel,
} from "../models";

import type { GridStore } from "./createGridStore";

import { buildColumns } from "../utils/GridColumnFactory";
import { GRID_SELECTION_FIELD } from "../utils/GridConstants";

const GridStoreContext =
    createContext<
        StoreApi<GridStore<any>> | null
    >(null);

interface GridProviderProps<
    T extends GridRowModel
> {
    store: StoreApi<GridStore<T>>;
    props: GridProps<T>;
    children: ReactNode;
}

export default function GridProvider<
    T extends GridRowModel
>({
    store,
    props,
    children,
}: GridProviderProps<T>) {
    const storeRef = useRef(store);
    const serverRequestRef = useRef(0);
    const rowModelType =
        props.rowModelType ?? "clientSide";
    const isServerSide =
        rowModelType === "serverSide";
    const pagination = useStore(
        store,
        (state) => state.pagination
    );
    const sortModel = useStore(
        store,
        (state) => state.sortModel
    );
    const quickFilter = useStore(
        store,
        (state) => state.quickFilter
    );

    useEffect(() => {
        if (isServerSide) {
            return;
        }

        storeRef.current
            .getState()
            .setRows(props.rows);
    }, [props.rows, isServerSide]);

    useEffect(() => {
        if (
            !isServerSide ||
            !props.serverSideDatasource
        ) {
            return;
        }

        const requestId =
            ++serverRequestRef.current;
        const state = storeRef.current.getState();
        const request = {
            page: pagination.page,
            pageSize: pagination.pageSize,
            startRow:
                pagination.page *
                pagination.pageSize,
            endRow:
                pagination.page *
                    pagination.pageSize +
                pagination.pageSize,
            sortModel,
            quickFilter,
        };
        let settled = false;

        function applySuccess(result: {
            rows: T[];
            rowCount: number;
        }) {
            if (
                settled ||
                requestId !== serverRequestRef.current
            ) {
                return;
            }

            settled = true;
            storeRef.current
                .getState()
                .setRows(result.rows);
            storeRef.current
                .getState()
                .setRowCount(result.rowCount);
            storeRef.current
                .getState()
                .setLoading(false);
        }

        function applyFailure() {
            if (
                settled ||
                requestId !== serverRequestRef.current
            ) {
                return;
            }

            settled = true;
            storeRef.current
                .getState()
                .setLoading(false);
        }

        state.setLoading(true);

        try {
            const result =
                props.serverSideDatasource.getRows({
                    request,
                    success: applySuccess,
                    fail: applyFailure,
                });

            if (result instanceof Promise) {
                result.then(applySuccess).catch(applyFailure);
                return;
            }

            if (result) {
                applySuccess(result);
            }
        } catch {
            applyFailure();
        }
    }, [
        isServerSide,
        props.serverSideDatasource,
        pagination.page,
        pagination.pageSize,
        sortModel,
        quickFilter,
    ]);

    useEffect(() => {
        const sortModel =
            props.sortModel ?? props.initialSortModel;

        if (!sortModel) {
            return;
        }

        storeRef.current
            .getState()
            .setSortModel(sortModel);
    }, [
        props.sortModel,
        props.initialSortModel,
    ]);

    // Columns sync
    useEffect(() => {
        const nextColumns = buildColumns(
            props.columns,
            props.checkboxSelection
        );
        const state = storeRef.current.getState();

        storeRef.current
            .getState()
            .setColumns(nextColumns);

        if (
            props.sortModel !== undefined ||
            props.initialSortModel !== undefined ||
            state.sortModel.length > 0
        ) {
            return;
        }

        const defaultSortColumn = nextColumns.find(
            (column) =>
                column.field !==
                    (GRID_SELECTION_FIELD as keyof T) &&
                column.sortable !== false &&
                !column.hidden
        );

        if (defaultSortColumn) {
            storeRef.current.getState().setSortModel([
                {
                    field: defaultSortColumn.field,
                    direction: "asc",
                },
            ]);
        }
    }, [
        props.columns,
        props.checkboxSelection,
        props.sortModel,
        props.initialSortModel,
    ]);

    // Loading sync
    useEffect(() => {
        if (
            isServerSide &&
            props.loading === undefined
        ) {
            return;
        }

        storeRef.current
            .getState()
            .setLoading(
                props.loading ?? false
            );
    }, [props.loading, isServerSide]);

    return (
        <GridStoreContext.Provider
            value={storeRef.current}
        >
            {children}
        </GridStoreContext.Provider>
    );
}

export function useGridStoreContext<
    T extends GridRowModel
>() {
    const context =
        useContext(GridStoreContext);

    if (!context) {
        throw new Error(
            "useGridStore must be used inside GridProvider."
        );
    }

    return context as StoreApi<GridStore<T>>;
}
