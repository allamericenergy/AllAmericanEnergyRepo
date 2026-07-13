import { createTheme } from "@mui/material/styles";

export const IntiliGridTheme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#2563eb",
            dark: "#1d4ed8",
            light: "#dbeafe",
        },
        background: {
            default: "#f8fafc",
            paper: "#ffffff",
        },
        text: {
            primary: "#111827",
            secondary: "#4b5563",
        },
        divider: "#d9dee8",
        action: {
            hover: "#f3f7ff",
            selected: "#dceafe",
            focus: "#bfdbfe",
        },
    },
    typography: {
        fontFamily:
            '"Inter", "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: 13,
        button: {
            textTransform: "none",
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 4,
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    boxShadow: "none",
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    minHeight: 28,
                    borderRadius: 3,
                    boxShadow: "none",
                },
                outlined: {
                    borderColor: "#cbd5e1",
                    color: "#1f2937",
                    backgroundColor: "#ffffff",
                    "&:hover": {
                        borderColor: "#94a3b8",
                        backgroundColor: "#f8fafc",
                    },
                },
            },
        },
        MuiCheckbox: {
            styleOverrides: {
                root: {
                    padding: 4,
                    color: "#64748b",
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                size: "small",
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 3,
                    backgroundColor: "#ffffff",
                    fontSize: 13,
                },
                input: {
                    paddingTop: 7,
                    paddingBottom: 7,
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                select: {
                    paddingTop: 6,
                    paddingBottom: 6,
                    fontSize: 13,
                },
            },
        },
    },
});
