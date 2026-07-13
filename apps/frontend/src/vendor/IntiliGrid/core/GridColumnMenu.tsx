import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";

import type { GridColumn, GridRowModel } from "../models";
import { useGridRuntime } from "../runtime";

interface GridColumnMenuProps<T extends GridRowModel> {
    column: GridColumn<T>;
}

export default function GridColumnMenu<T extends GridRowModel>({
    column,
}: GridColumnMenuProps<T>) {
    const runtime = useGridRuntime<T>();

    const [anchorEl, setAnchorEl] =
        useState<HTMLElement | null>(null);

    const open = Boolean(anchorEl);

    function closeMenu() {
        setAnchorEl(null);
    }

    return (
        <>
            <IconButton
                size="small"
                onClick={(event) => {
                    event.stopPropagation();
                    setAnchorEl(event.currentTarget);
                }}
            >
                <MoreVertIcon fontSize="small" />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={closeMenu}
            >
                <MenuItem
                    onClick={() => {
                        runtime.sort(column.field, "asc");
                        closeMenu();
                    }}
                >
                    Sort Asc
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        runtime.sort(column.field, "desc");
                        closeMenu();
                    }}
                >
                    Sort Desc
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        runtime.clearSorting();
                        closeMenu();
                    }}
                >
                    Clear Sort
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        runtime.pinColumn(column.field, "left");
                        closeMenu();
                    }}
                >
                    Pin Left
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        runtime.pinColumn(column.field, "right");
                        closeMenu();
                    }}
                >
                    Pin Right
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        runtime.unpinColumn(column.field);
                        closeMenu();
                    }}
                >
                    Unpin
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        runtime.hideColumn(column.field);
                        closeMenu();
                    }}
                >
                    Hide Column
                </MenuItem>
            </Menu>
        </>
    );
}