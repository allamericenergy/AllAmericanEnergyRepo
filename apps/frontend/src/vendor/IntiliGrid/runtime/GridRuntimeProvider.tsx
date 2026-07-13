import {
    useMemo,
    type ReactNode,
} from "react";

import type { StoreApi } from "zustand";

import { createGridStore } from "../store/createGridStore";

import type { GridStore } from "../store/createGridStore";
import type { GridProps } from "../models/GridProps";
import type { GridRowModel } from "../models/GridRowModel";

import { GridRuntime } from "./GridRuntime";
import { GridRuntimeContext } from "./GridRuntimeContext";

interface Props<
    T extends GridRowModel
> {

    props: GridProps<T>;

    children: ReactNode;

}

export function GridRuntimeProvider<
    T extends GridRowModel
>({
    props,
    children,
}: Props<T>) {

    const runtime = useMemo(() => {

        const store =
            createGridStore<T>() as StoreApi<GridStore<T>>;

        store.getState().setRows(props.rows);

        store.getState().setColumns(props.columns);

        store.getState().setLoading(
            props.loading ?? false
        );

        return new GridRuntime(store);

    }, []);

    return (

        <GridRuntimeContext.Provider
            value={runtime}
        >

            {children}

        </GridRuntimeContext.Provider>

    );

}