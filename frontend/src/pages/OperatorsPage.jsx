import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputAdornment,
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
  LOCKERS,
  MAX_WEIGHT,
  TRACKING_PATTERN,
  loadPackages,
  priorityRowSx,
  savePackages,
} from "../data/storage";

const emptyForm = {
  trackingNumber: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  building: "",
  locker: "",
  priority: "low",
};

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export default function OperatorsPage() {
  const [packages, setPackages] = useState(() => loadPackages());
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);

  const formValid = useMemo(() => {
    return (
      TRACKING_PATTERN.test(form.trackingNumber.trim().toUpperCase()) &&
      Number(form.weight) > 0 &&
      Number(form.weight) <= MAX_WEIGHT &&
      Number(form.length) > 0 &&
      Number(form.width) > 0 &&
      Number(form.height) > 0 &&
      form.building &&
      form.locker
    );
  }, [form]);

  function updateField(field) {
    return (event) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function validatePackage(pkg, current) {
    if (!TRACKING_PATTERN.test(pkg.trackingNumber)) {
      return "Tracking number must be PKG followed by 4 digits.";
    }
    if (current.some((p) => p.trackingNumber === pkg.trackingNumber)) {
      return `${pkg.trackingNumber} has already been checked in.`;
    }
    if (
      [pkg.weight, pkg.length, pkg.width, pkg.height].some(
        (n) => Number.isNaN(n) || n <= 0,
      )
    ) {
      return "Weight and dimensions must be positive numbers.";
    }
    if (pkg.weight > MAX_WEIGHT) {
      return `Weight cannot exceed ${MAX_WEIGHT} lbs.`;
    }
    if (!pkg.destinationBuilding || !pkg.destinationLocker) {
      return "Select a building and a locker.";
    }
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const current = loadPackages();
    const pkg = {
      trackingNumber: form.trackingNumber.trim().toUpperCase(),
      priority: form.priority,
      destinationBuilding: form.building,
      destinationLocker: form.locker,
      weight: parseFloat(form.weight),
      length: parseFloat(form.length),
      width: parseFloat(form.width),
      height: parseFloat(form.height),
      status: "AVAILABLE",
      assignedDriver: null,
      createdAt: new Date().toISOString(),
      signedBy: null,
      signedAt: null,
    };

    const error = validatePackage(pkg, current);
    if (error) {
      setMessage({ text: error, severity: "error" });
      return;
    }

    const next = [...current, pkg];
    savePackages(next);
    setPackages(next);
    setForm(emptyForm);
    setMessage({
      text: `Package ${pkg.trackingNumber} checked in with status ${pkg.status}.`,
      severity: "success",
    });
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h1">Central Hub Operators Portal</Typography>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 380px) 1fr" },
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Typography variant="h2" gutterBottom>
            Package tracker
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Input all required information into the form and submit for log
            tracking
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <Typography variant="h4">Receipt Information</Typography>
              <TextField
                label="Tracking Number"
                value={form.trackingNumber}
                onChange={updateField("trackingNumber")}
                placeholder="PKG1001"
                required
                fullWidth
                helperText="PKG followed by 4 digits"
              />

              <Typography variant="h4">Package Information</Typography>
              <TextField
                label="Weight"
                type="number"
                value={form.weight}
                onChange={updateField("weight")}
                required
                fullWidth
                inputProps={{ min: 0.01, max: MAX_WEIGHT, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">lbs</InputAdornment>,
                }}
              />
              <TextField
                label="Length"
                type="number"
                value={form.length}
                onChange={updateField("length")}
                required
                fullWidth
                inputProps={{ min: 0.01, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">in</InputAdornment>,
                }}
              />
              <TextField
                label="Width"
                type="number"
                value={form.width}
                onChange={updateField("width")}
                required
                fullWidth
                inputProps={{ min: 0.01, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">in</InputAdornment>,
                }}
              />
              <TextField
                label="Height"
                type="number"
                value={form.height}
                onChange={updateField("height")}
                required
                fullWidth
                inputProps={{ min: 0.01, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">in</InputAdornment>,
                }}
              />

              <Typography variant="h4">Destination Information</Typography>
              <TextField
                select
                label="Building"
                value={form.building}
                onChange={updateField("building")}
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
              <TextField
                select
                label="Locker"
                value={form.locker}
                onChange={updateField("locker")}
                required
                fullWidth
              >
                <MenuItem value="">Select Locker</MenuItem>
                {LOCKERS.map((l) => (
                  <MenuItem key={l.value} value={l.value}>
                    {l.label}
                  </MenuItem>
                ))}
              </TextField>

              <FormControl>
                <FormLabel>Package Priority</FormLabel>
                <RadioGroup
                  row
                  value={form.priority}
                  onChange={updateField("priority")}
                >
                  {["low", "medium", "high", "urgent"].map((p) => (
                    <FormControlLabel
                      key={p}
                      value={p}
                      control={<Radio />}
                      label={capitalize(p)}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                Low — Same week · Medium — 1-3 days · High — Same day · Urgent —
                Before noon
              </Typography>

              <Button type="submit" variant="contained" disabled={!formValid}>
                Submit Package Details
              </Button>

              {message && (
                <Alert severity={message.severity}>{message.text}</Alert>
              )}
            </Stack>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, overflowX: "auto" }}>
          <Typography variant="h2" gutterBottom>
            Tracking table
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tracking Number</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Locker</TableCell>
                <TableCell>Weight</TableCell>
                <TableCell>Length</TableCell>
                <TableCell>Width</TableCell>
                <TableCell>Height</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.trackingNumber} sx={priorityRowSx(pkg.priority)}>
                  <TableCell>{pkg.trackingNumber}</TableCell>
                  <TableCell>{capitalize(pkg.priority)}</TableCell>
                  <TableCell>{pkg.destinationBuilding}</TableCell>
                  <TableCell>{pkg.destinationLocker}</TableCell>
                  <TableCell>{pkg.weight} lbs</TableCell>
                  <TableCell>{pkg.length} in.</TableCell>
                  <TableCell>{pkg.width} in.</TableCell>
                  <TableCell>{pkg.height} in.</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Stack>
  );
}
