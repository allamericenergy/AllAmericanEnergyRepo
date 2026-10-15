import { useContext } from "react";

import { GridRuntimeContext } from "./GridRuntimeContext";

import type { GridRuntime } from "./GridRuntime";
import type { GridRowModel } from "../models";

export function useGridRuntime<
    T extends GridRowModel
>() {
    const runtime =
        useContext(GridRuntimeContext);

    if (!runtime) {
        throw new Error(
            "GridRuntimeProvider missing."
        );
    }

    return runtime as GridRuntime<T>;
}