import Box from "@mui/material/Box";

import type { GridProps, GridRowModel } from "../models";

import GridRow from "./GridRow";
import type { GridTreeNodeMeta } from "../hooks/useTreeDataRows";

interface GridBodyProps<T extends GridRowModel> {
    props: GridProps<T>;
    rows: T[];
    rowOffset: number;
    rowHeight: number;
    treeMetadata?: Map<T["id"], GridTreeNodeMeta & { key: string }>;
    onToggleTreeNode?: (key: string, expanded: boolean) => void;
}

export default function GridBody<T extends GridRowModel>({
    props,
    rows,
    rowOffset,
    rowHeight,
    treeMetadata,
    onToggleTreeNode,
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
                    treeNode={treeMetadata?.get(row.id)}
                    treeDataColumnField={props.treeDataColumnField}
                    onToggleTreeNode={onToggleTreeNode}
                />
            ))}
        </Box>
    );
}
