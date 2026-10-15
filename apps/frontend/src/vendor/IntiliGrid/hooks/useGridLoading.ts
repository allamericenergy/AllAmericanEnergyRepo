import { useGridStore } from "../store/useGridStore";

export function useGridLoading<
    T extends { id: string | number }
>() {
    return useGridStore<T, boolean>(
        state => state.loading
    );
}