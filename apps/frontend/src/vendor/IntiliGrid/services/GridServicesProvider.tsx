import {
    createContext,
    useContext,
    type ReactNode,
} from "react";

import type { GridServices } from "./GridServices";
import type { GridRowModel } from "../models";

const GridServicesContext =
    createContext<GridServices<any> | null>(null);

interface Props<T extends GridRowModel> {
    services: GridServices<T>;
    children: ReactNode;
}

export function GridServicesProvider<T extends GridRowModel>({
    services,
    children,
}: Props<T>) {
    return (
        <GridServicesContext.Provider value={services}>
            {children}
        </GridServicesContext.Provider>
    );
}

export function useGridServices<
    T extends GridRowModel = GridRowModel
>() {
    const services = useContext(GridServicesContext);

    if (!services) {
        throw new Error("GridServicesProvider missing.");
    }

    return services as GridServices<T>;
}