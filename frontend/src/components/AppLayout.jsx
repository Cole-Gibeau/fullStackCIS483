import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

const links = [
  { to: "/", label: "Home" },
  { to: "/operators", label: "Operators" },
  { to: "/drivers", label: "Drivers" },
  { to: "/end-users", label: "End Users" },
];

export default function AppLayout() {
  const location = useLocation();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar sx={{ flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            MNSU-CampusEco
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {links.map((link) => (
              <Button
                key={link.to}
                component={RouterLink}
                to={link.to}
                color="inherit"
                variant={location.pathname === link.to ? "outlined" : "text"}
                sx={{ borderColor: "rgba(255,255,255,0.55)" }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Outlet />
      </Container>

      <Box component="footer" sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
        <Typography variant="body2">
          &copy; 2026 MNSU-CampusEco. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
