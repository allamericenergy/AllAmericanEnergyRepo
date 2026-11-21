import Box from "@mui/material/Box";

import type { GridRowModel } from "../models";

import { useGridRuntime } from "../runtime";

import GridToolbarButton from "./GridToolbarButton";
import TextField from "@mui/material/TextField";
import { useGridStore } from "../store/useGridStore";


export default function GridToolbar<
    T extends GridRowModel
>({ exportFileName }: { exportFileName?: string } = {}) {
    const runtime = useGridRuntime<T>();

    const quickFilter = useGridStore<T, string>(
        (state) => state.quickFilter
    );

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderBottom: 1,
                borderColor: "divider",
                position: "relative",
                backgroundColor: "#ffffff",
                minHeight: 44,
            }}
        >
            <TextField
                size="small"
                placeholder="Search..."
                value={quickFilter}
                onChange={(event) =>
                    runtime.setQuickFilter(event.target.value)
                }
                sx={{
                    width: 240,
                    "& .MuiInputBase-root": {
                        height: 30,
                    },
                }}
            />
            <GridToolbarButton
                onClick={() =>
                    runtime.exportCsv("visible", exportFileName)
                }
            >
                Export CSV
            </GridToolbarButton>
            <GridToolbarButton
                onClick={() =>
                    runtime.exportCsv("selected", exportFileName)
                }
            >
                Export Selected
            </GridToolbarButton>
        </Box>
    );
}
