import Button from "@mui/material/Button";
import type { ReactNode } from "react";

interface GridToolbarButtonProps {
    children: ReactNode;
    onClick?(): void;
}

export default function GridToolbarButton({
    children,
    onClick,
}: GridToolbarButtonProps) {
    return (
        <Button
            size="small"
            variant="outlined"
            onClick={onClick}
            sx={{
                height: 28,
                px: 1.25,
                fontSize: 12,
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </Button>
    );
}
