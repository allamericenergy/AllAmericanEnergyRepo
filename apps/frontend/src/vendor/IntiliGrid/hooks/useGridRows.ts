import { useGridStore } from "../store/useGridStore";

export function useGridRows<
    T extends { id: string | number }
>() {
    return useGridStore<T, T[]>(
        state => state.rows
    );
}