import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import theme from "./theme";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import OperatorsPage from "./pages/OperatorsPage";
import DriversPage from "./pages/DriversPage";
import EndUsersPage from "./pages/EndUsersPage";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/operators" element={<OperatorsPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/end-users" element={<EndUsersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
