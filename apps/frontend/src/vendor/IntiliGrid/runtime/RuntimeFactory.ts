import type { StoreApi } from "zustand";

import type { GridStore } from "../store/createGridStore";
import type { GridRowModel } from "../models";

import { GridRuntime } from "./GridRuntime";

export function createGridRuntime<
    T extends GridRowModel
>(
    store: StoreApi<GridStore<T>>
) {
    return new GridRuntime(store);
}