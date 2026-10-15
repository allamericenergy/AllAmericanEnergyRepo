import { useStore } from "zustand";

import { useGridStoreContext } from "./GridProvider";

import type { GridRowModel } from "../models";
import type { GridStore } from "./createGridStore";

export function useGridStore<
    T extends GridRowModel,
    U
>(
    selector: (state: GridStore<T>) => U
): U {
    const store = useGridStoreContext<T>();

    return useStore(store, selector);
}