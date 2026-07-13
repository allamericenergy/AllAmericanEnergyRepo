import type { GridStore } from "./createGridStore";

export const selectActions = <
    T extends { id: string | number }
>(
    state: GridStore<T>
) => ({
    setRows: state.setRows,
    setColumns: state.setColumns,
    setLoading: state.setLoading,
    toggleRow: state.toggleRow,
    clearSelection: state.clearSelection,
    setSorting: state.setSorting,
});