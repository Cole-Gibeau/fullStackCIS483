import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#603080",
      dark: "#482460",
      light: "#8a5aad",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f3eef8",
      paper: "#ffffff",
    },
    error: { main: "#b42318" },
    success: { main: "#18733c" },
  },
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    h1: { color: "#603080", fontSize: "2rem", fontWeight: 700 },
    h2: { color: "#603080", fontSize: "1.5rem", fontWeight: 700 },
    h3: { color: "#603080", fontSize: "1.25rem", fontWeight: 600 },
    h4: { color: "#603080", fontSize: "1.1rem", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          minHeight: 44,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid #d5c5e3",
        },
      },
    },
  },
});

export default theme;
