import { useGridStore } from "../store/useGridStore";

export function useGridSelection<
    T extends { id: string | number }
>() {
    return useGridStore<T, Set<T["id"]>>(
        state => state.selection.selectedRows
    );
}
