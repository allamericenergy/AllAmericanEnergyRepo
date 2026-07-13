import Box from "@mui/material/Box";

import type { GridProps, GridRowModel } from "../models";

import GridRow from "./GridRow";

interface GridBodyProps<T extends GridRowModel> {
    props: GridProps<T>;
    rows: T[];
    rowOffset: number;
    rowHeight: number;
}

export default function GridBody<T extends GridRowModel>({
    props,
    rows,
    rowOffset,
    rowHeight,
}: GridBodyProps<T>) {
    if (rows.length === 0) {
        return (
            <Box
                sx={{
                    p: 4,
                    textAlign: "center",
                }}
            >
                No Records Found
            </Box>
        );
    }

    return (
        <Box sx={{
            display: "inline-flex",
            flexDirection: "column",
            minWidth: "max-content",
            width: "max-content",
        }}>
            {rows.map((row, index) => (
                <GridRow<T>
                    key={row.id}
                    row={row}
                    rowIndex={rowOffset + index}
                    rowHeight={rowHeight}
                    onRowClick={props.onRowClick}
                />
            ))}
        </Box>
    );
}