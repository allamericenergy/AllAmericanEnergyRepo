import type { GridRowModel } from "../models/GridRowModel";

import type { GridRuntime } from "../runtime/GridRuntime";

import type { GridServices } from "./GridServices";

export function createGridServices<
    T extends GridRowModel
>(
    runtime: GridRuntime<T>
): GridServices<T> {

    return {

        runtime,

    };

}