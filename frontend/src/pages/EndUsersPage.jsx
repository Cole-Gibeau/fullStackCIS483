import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  BUILDINGS,
  formatLocker,
  getDisplayStatus,
  loadPackages,
  loadPreferences,
  savePackages,
  savePreferences,
} from "../data/storage";

export default function EndUsersPage() {
  const [packages, setPackages] = useState(() => loadPackages());
  const [trackInput, setTrackInput] = useState("");
  const [trackMessage, setTrackMessage] = useState("");
  const [signPkg, setSignPkg] = useState("");
  const [signName, setSignName] = useState("");
  const [received, setReceived] = useState(false);
  const [signoffMessage, setSignoffMessage] = useState("");
  const [prefs, setPrefs] = useState(() => loadPreferences());
  const [prefsMessage, setPrefsMessage] = useState("");

  function refreshPackages() {
    const next = loadPackages();
    setPackages(next);
    return next;
  }

  function handleTrack(event) {
    event.preventDefault();
    const current = refreshPackages();
    const entered = trackInput.trim().toUpperCase();
    const found = current.find(
      (p) => p.trackingNumber.toUpperCase() === entered,
    );

    if (!found) {
      setTrackMessage(`No package found with tracking number ${entered}.`);
      return;
    }

    setTrackMessage(
      `${found.trackingNumber} — ${getDisplayStatus(found.status)}. Destination: ${found.destinationBuilding} (${formatLocker(found.destinationLocker)}).`,
    );
  }

  function handleSignoff(event) {
    event.preventDefault();
    const current = refreshPackages();
    const entered = signPkg.trim().toUpperCase();
    const found = current.find(
      (p) => p.trackingNumber.toUpperCase() === entered,
    );

    if (!found) {
      setSignoffMessage(`Package ${entered} not found.`);
      return;
    }
    if (found.signedAt) {
      setSignoffMessage("This package has already been signed for.");
      return;
    }
    if (!signName.trim() || !received) {
      setSignoffMessage(
        "Enter your name and confirm that you received the package.",
      );
      return;
    }
    if (found.status !== "DELIVERED") {
      setSignoffMessage(
        `Cannot sign off: ${found.trackingNumber} has not been marked Delivered yet (Current status: ${getDisplayStatus(found.status)}).`,
      );
      return;
    }

    found.signedBy = signName.trim();
    found.signedAt = new Date().toISOString();
    savePackages(current);
    setPackages([...current]);
    setSignoffMessage(
      `Delivery confirmed for ${found.trackingNumber}. Thank you, ${found.signedBy}!`,
    );
    setSignPkg("");
    setSignName("");
    setReceived(false);
  }

  function handlePreferences(event) {
    event.preventDefault();
    savePreferences(prefs);
    setPrefsMessage("Delivery preferences successfully saved!");
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h1">End Users Portal</Typography>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(auto-fit, minmax(320px, 1fr))",
          },
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Typography variant="h2" gutterBottom>
            Track a package
          </Typography>
          <Box component="form" onSubmit={handleTrack}>
            <Stack spacing={2}>
              <TextField
                label="Tracking number"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                placeholder="PKG1001"
                required
                fullWidth
                inputProps={{ pattern: "PKG[0-9]{4}" }}
              />
              <Button type="submit" variant="contained">
                Track
              </Button>
              {trackMessage && (
                <Alert
                  severity={
                    trackMessage.startsWith("No package") ? "error" : "info"
                  }
                >
                  {trackMessage}
                </Alert>
              )}
            </Stack>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, overflowX: "auto" }}>
          <Typography variant="h2" gutterBottom>
            My packages
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tracking Number</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Locker</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.map((p) => (
                <TableRow key={p.trackingNumber}>
                  <TableCell>{p.trackingNumber}</TableCell>
                  <TableCell>{p.destinationBuilding}</TableCell>
                  <TableCell>{formatLocker(p.destinationLocker)}</TableCell>
                  <TableCell>
                    {p.signedAt
                      ? "Delivered / Signed"
                      : getDisplayStatus(p.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h2" gutterBottom>
            Sign for a delivery
          </Typography>
          <Box component="form" onSubmit={handleSignoff}>
            <Stack spacing={2}>
              <TextField
                label="Tracking number"
                value={signPkg}
                onChange={(e) => setSignPkg(e.target.value)}
                required
                fullWidth
                inputProps={{ pattern: "PKG[0-9]{4}" }}
              />
              <TextField
                label="Full name"
                value={signName}
                onChange={(e) => setSignName(e.target.value)}
                required
                fullWidth
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={received}
                    onChange={(e) => setReceived(e.target.checked)}
                  />
                }
                label="I received this package"
              />
              <Button type="submit" variant="contained">
                Confirm Delivery
              </Button>
              {signoffMessage && (
                <Alert
                  severity={
                    signoffMessage.includes("Thank you") ? "success" : "warning"
                  }
                >
                  {signoffMessage}
                </Alert>
              )}
            </Stack>
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h2" gutterBottom>
            Delivery preferences
          </Typography>
          <Box component="form" onSubmit={handlePreferences}>
            <Stack spacing={2}>
              <TextField
                select
                label="Building"
                value={prefs.building}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, building: e.target.value }))
                }
                required
                fullWidth
              >
                <MenuItem value="">Select Building</MenuItem>
                {BUILDINGS.map((b) => (
                  <MenuItem key={b} value={b}>
                    {b}
                  </MenuItem>
                ))}
              </TextField>

              <FormControl>
                <FormLabel>Delivery location</FormLabel>
                <RadioGroup
                  row
                  value={prefs.location}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, location: e.target.value }))
                  }
                >
                  <FormControlLabel
                    value="room"
                    control={<Radio />}
                    label="My room or office"
                  />
                  <FormControlLabel
                    value="locker"
                    control={<Radio />}
                    label="Locker"
                  />
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Notify me when</FormLabel>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={prefs.notifyTransit}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          notifyTransit: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Package is en route"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={prefs.notifyDelivered}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          notifyDelivered: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Package is delivered"
                />
              </FormControl>

              <Button type="submit" variant="contained">
                Save Preferences
              </Button>
              {prefsMessage && <Alert severity="success">{prefsMessage}</Alert>}
            </Stack>
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h2" gutterBottom>
            Your carbon savings
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Packages Delivered</TableCell>
                <TableCell>CO2 Avoided</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>12</TableCell>
                <TableCell>18.4 kg</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h2" gutterBottom>
            Create an account
          </Typography>
          <Typography color="text.secondary">
            Account registration will be added with server authentication.
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}
