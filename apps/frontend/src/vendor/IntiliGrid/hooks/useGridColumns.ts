import { useGridStore } from "../store/useGridStore";
import type { GridColumn } from "../models/GridColumn";

export function useGridColumns<
    T extends { id: string | number }
>() {
    return useGridStore<T, GridColumn<T>[]>(
        state => state.columns
    );
}