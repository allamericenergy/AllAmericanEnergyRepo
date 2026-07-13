import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";

import type { GridRowModel } from "../models";

import { useGridStore } from "../store/useGridStore";
import { useGridRuntime } from "../runtime";

export default function GridFooter<
    T extends GridRowModel
>() {
    const runtime = useGridRuntime<T>();

    const totalRows = useGridStore<T, number>(
        (state) => state.rowCount
    );

    const pagination = useGridStore<
        T,
        {
            page: number;
            pageSize: number;
        }
    >((state) => state.pagination);

    const totalPages = Math.max(
        1,
        Math.ceil(
            totalRows / pagination.pageSize
        )
    );

    return (
        <Box
            sx={{
                height: 42,
                px: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: 1,
                borderColor: "divider",
                backgroundColor: "#f8fafc",
            }}
        >
            <Typography
                variant="body2"
                sx={{
                    color: "text.secondary",
                    fontSize: 12,
                }}
            >
                Page {pagination.page + 1} of {totalRows}
            </Typography>

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                }}
            >
                <Select
                    size="small"
                    value={pagination.pageSize}
                    onChange={(event) =>
                        runtime.setPageSize(
                            Number(event.target.value)
                        )
                    }
                >
                    {[10, 25, 50, 100].map((size) => (
                        <MenuItem
                            key={size}
                            value={size}
                        >
                            {size}
                        </MenuItem>
                    ))}
                </Select>

                <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                        runtime.firstPage()
                    }
                    disabled={pagination.page === 0}
                >
                    First
                </Button>

                <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                        runtime.previousPage()
                    }
                    disabled={pagination.page === 0}
                >
                    Prev
                </Button>

                <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                        runtime.nextPage()
                    }
                    disabled={
                        pagination.page >=
                        totalPages - 1
                    }
                >
                    Next
                </Button>

                <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                        runtime.lastPage()
                    }
                    disabled={
                        pagination.page >=
                        totalPages - 1
                    }
                >
                    Last
                </Button>
            </Box>
        </Box>
    );
}
