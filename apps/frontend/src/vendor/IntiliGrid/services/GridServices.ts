import type { GridRowModel } from "../models/GridRowModel";

import type { GridRuntime } from "../runtime/GridRuntime";

export interface GridServices<
    T extends GridRowModel
> {

    runtime: GridRuntime<T>;

}