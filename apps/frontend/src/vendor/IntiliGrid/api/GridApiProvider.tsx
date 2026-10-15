import {
    createContext,
    useContext,
    type ReactNode,
} from "react";

import type { GridRowModel } from "../models";
import type { GridApi } from "./GridApi";

const GridApiContext =
    createContext<GridApi<any> | null>(null);

interface GridApiProviderProps<T extends GridRowModel> {
    api: GridApi<T>;
    children: ReactNode;
}

export function GridApiProvider<T extends GridRowModel>({
    api,
    children,
}: GridApiProviderProps<T>) {
    return (
        <GridApiContext.Provider value={api}>
            {children}
        </GridApiContext.Provider>
    );
}

export function useGridApi<T extends GridRowModel>() {
    const api = useContext(GridApiContext);

    if (!api) {
        throw new Error("GridApiProvider missing.");
    }

    return api as GridApi<T>;
}