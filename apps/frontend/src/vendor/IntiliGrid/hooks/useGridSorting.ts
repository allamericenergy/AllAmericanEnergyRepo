import { useGridStore } from "../store/useGridStore";

export function useGridSorting<
    T extends { id: string | number }
>() {
    return useGridStore<
        T,
        {
            field?: keyof T;
            direction: "asc" | "desc" | null;
        }
    >(state => ({
        field: state.sorting.field,
        direction: state.sorting.direction,
    }));
}
