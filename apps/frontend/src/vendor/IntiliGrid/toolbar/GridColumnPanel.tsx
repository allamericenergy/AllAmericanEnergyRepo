import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";

import type {
    GridColumn,
    GridRowModel,
} from "../models";

import { useGridStore } from "../store/useGridStore";
import { useGridRuntime } from "../runtime";

export default function GridColumnPanel<
    T extends GridRowModel
>() {
    const runtime = useGridRuntime<T>();

    const columns = useGridStore<
        T,
        GridColumn<T>[]
    >((state) => state.columns);

    return (
        <Box
            sx={{
                p: 1,
                minWidth: 220,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                backgroundColor: "background.paper",
                boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
            }}
        >
            {columns.map((column) => (
                <Box
                    key={String(column.field)}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        minHeight: 30,
                        px: 0.5,
                        borderRadius: 0.5,
                        "&:hover": {
                            backgroundColor: "action.hover",
                        },
                    }}
                >
                    <Checkbox
                        size="small"
                        checked={!column.hidden}
                        onChange={() =>
                            runtime.toggleColumnVisibility(
                                column.field
                            )
                        }
                    />

                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: 13,
                        }}
                    >
                        {column.headerName}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}
