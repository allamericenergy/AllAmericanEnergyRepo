import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

export default function GridLoading() {

    return (

        <Box
            sx={{
                py: 6,
                display: "flex",
                justifyContent: "center",
            }}
        >

            <CircularProgress />

        </Box>

    );

}