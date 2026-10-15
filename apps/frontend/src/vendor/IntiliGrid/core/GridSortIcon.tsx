import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";

import type { GridSortDirection } from "../models";

interface GridSortIconProps {
    direction: GridSortDirection;
}

export default function GridSortIcon({
    direction,
}: GridSortIconProps) {
    if (direction === "asc") {
        return (
            <ArrowUpwardIcon
                fontSize="inherit"
                sx={{
                    color: "primary.main",
                    fontSize: 15,
                }}
            />
        );
    }

    if (direction === "desc") {
        return (
            <ArrowDownwardIcon
                fontSize="inherit"
                sx={{
                    color: "primary.main",
                    fontSize: 15,
                }}
            />
        );
    }

    return (
        <UnfoldMoreIcon
            fontSize="inherit"
            sx={{
                color: "text.disabled",
                fontSize: 17,
            }}
        />
    );
}
