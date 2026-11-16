import { Link as RouterLink } from "react-router-dom";
import { Button, Paper, Stack, Typography } from "@mui/material";

export default function HomePage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h1" gutterBottom>
        The landing page for MNSU-CampusEco
      </Typography>
      <Typography paragraph>
        This is the home page for MNSU-CampusEco. Below you will see buttons that
        correspond with positions. Please select your position to proceed.
      </Typography>
      <Stack spacing={1.5} direction={{ xs: "column", sm: "row" }}>
        <Button component={RouterLink} to="/operators" variant="contained" fullWidth>
          Go to Operators
        </Button>
        <Button component={RouterLink} to="/end-users" variant="contained" fullWidth>
          Go to End Users
        </Button>
        <Button component={RouterLink} to="/drivers" variant="contained" fullWidth>
          Go to Drivers
        </Button>
      </Stack>
    </Paper>
  );
}
