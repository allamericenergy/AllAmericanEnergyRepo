import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export default function GridEmpty() {

    return (

        <Box
            sx={{
                py: 6,
                display: "flex",
                justifyContent: "center",
            }}

        >

            <Typography color="text.secondary">

                No records found

            </Typography>

        </Box>

    );

}