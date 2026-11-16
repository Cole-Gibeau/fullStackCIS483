import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Collapse,
  MenuItem,
  Paper,
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
  DRIVER,
  NODE_API_BASE,
  formatLocker,
  getDisplayStatus,
  loadPackages,
  loadVehicle,
  savePackages,
  saveVehicle,
} from "../data/storage";

const MILESTONE_OPTIONS = [
  { value: "CLAIMED", label: "Claimed" },
  { value: "LOADED", label: "Loaded" },
  { value: "EN_ROUTE", label: "En Route" },
  { value: "DELIVERED", label: "Delivered" },
];

function syncMilestoneWithNode(trackingNumber, status, cartId) {
  fetch(`${NODE_API_BASE}/packages/${trackingNumber}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      driverId: DRIVER.driverId,
      cartId,
    }),
  }).catch(() => {
    /* Node offline — local save still works */
  });
}

export default function DriversPage() {
  const [packages, setPackages] = useState(() => loadPackages());
  const [vehicle, setVehicle] = useState(() => loadVehicle());
  const [showVehicle, setShowVehicle] = useState(true);
  const [selectedTracking, setSelectedTracking] = useState("");
  const [rowStatus, setRowStatus] = useState({});
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [batteryMessage, setBatteryMessage] = useState(
    () =>
      (loadVehicle().lowBatteryReported &&
        `Low battery reported for ${loadVehicle().vehicleId}.`) ||
      "",
  );
  const [telemetryNote, setTelemetryNote] = useState("");

  const available = useMemo(
    () => packages.filter((p) => p.status === "AVAILABLE"),
    [packages],
  );

  const active = useMemo(
    () =>
      packages.filter(
        (p) =>
          p.status !== "AVAILABLE" &&
          p.status !== "DELIVERED" &&
          p.assignedDriver === DRIVER.driverId,
      ),
    [packages],
  );

  useEffect(() => {
    setRowStatus((prev) => {
      const next = {};
      active.forEach((p) => {
        next[p.trackingNumber] = prev[p.trackingNumber] || p.status;
      });
      return next;
    });
  }, [active]);

  useEffect(() => {
    function pollTelemetry() {
      fetch(`${NODE_API_BASE}/telemetry`)
        .then((r) => r.json())
        .then((data) => {
          const cart = data.carts?.find((c) => c.cartId === vehicle.vehicleId);
          if (cart) {
            setTelemetryNote(
              `${cart.cartId} · ${cart.location} · Battery ${cart.batteryPct}%`,
            );
          }
        })
        .catch(() => {});
    }
    pollTelemetry();
    const id = setInterval(pollTelemetry, 5000);
    return () => clearInterval(id);
  }, [vehicle.vehicleId]);

  function refreshFromStorage() {
    setPackages(loadPackages());
  }

  function handleClaim() {
    const current = loadPackages();
    const selected = current.find((p) => p.trackingNumber === selectedTracking);
    if (!selected) return;

    selected.status = "CLAIMED";
    selected.assignedDriver = DRIVER.driverId;
    savePackages(current);
    syncMilestoneWithNode(selected.trackingNumber, "CLAIMED", vehicle.vehicleId);
    setSelectedTracking("");
    setDeliveryMessage(`${selected.trackingNumber} claimed.`);
    refreshFromStorage();
  }

  function handleUpdate(trackingNumber) {
    const status = rowStatus[trackingNumber];
    const current = loadPackages();
    const pkg = current.find((p) => p.trackingNumber === trackingNumber);
    if (!pkg || !status) return;

    pkg.status = status;
    savePackages(current);
    syncMilestoneWithNode(trackingNumber, status, vehicle.vehicleId);
    setDeliveryMessage(
      `${trackingNumber} updated to ${getDisplayStatus(status)}.`,
    );
    refreshFromStorage();
  }

  function handleBatteryReport() {
    const next = { ...vehicle, lowBatteryReported: true };
    saveVehicle(next);
    setVehicle(next);
    setBatteryMessage(`Low battery reported for ${next.vehicleId}.`);

    fetch(`${NODE_API_BASE}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "LOW_BATTERY",
        cartId: next.vehicleId,
        message: `Low battery reported for ${next.vehicleId} by ${DRIVER.driverId}`,
      }),
    }).catch(() => {});
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h1">Drivers Portal</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h2" gutterBottom>
          Delivery Status & Log Update
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Must be logged in to view available orders, claim deliveries, and
          update transit milestones
        </Typography>

        <Stack spacing={3}>
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography variant="h4">Vehicle Information</Typography>
              <Button
                type="button"
                onClick={() => setShowVehicle((v) => !v)}
                aria-expanded={showVehicle}
              >
                {showVehicle ? "Hide Vehicle Info" : "Show Vehicle Details"}
              </Button>
            </Stack>
            <Collapse in={showVehicle}>
              <Stack spacing={1.5}>
                <Typography>
                  <strong>Vehicle ID:</strong> {vehicle.vehicleId}
                </Typography>
                {telemetryNote && (
                  <Typography variant="body2" color="text.secondary">
                    Live telemetry: {telemetryNote}
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  onClick={handleBatteryReport}
                  disabled={vehicle.lowBatteryReported}
                >
                  {vehicle.lowBatteryReported
                    ? "Battery Reported"
                    : "Report Low Battery"}
                </Button>
                {batteryMessage && (
                  <Alert severity="info">{batteryMessage}</Alert>
                )}
              </Stack>
            </Collapse>
          </Box>

          <Box>
            <Typography variant="h4" gutterBottom>
              Available Orders Queue
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ sm: "center" }}
            >
              <TextField
                select
                label="Select Available Delivery"
                value={selectedTracking}
                onChange={(e) => setSelectedTracking(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Select an order to claim</MenuItem>
                {available.map((p) => (
                  <MenuItem key={p.trackingNumber} value={p.trackingNumber}>
                    {p.trackingNumber} - {formatLocker(p.destinationLocker)} -{" "}
                    {p.destinationBuilding}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                disabled={!selectedTracking}
                onClick={handleClaim}
                sx={{ whiteSpace: "nowrap" }}
              >
                Claim Delivery
              </Button>
            </Stack>
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <Typography variant="h4" gutterBottom>
              My Delivery Schedule
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tracking Number</TableCell>
                  <TableCell>Building</TableCell>
                  <TableCell>Locker</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {active.map((p) => (
                  <TableRow key={p.trackingNumber}>
                    <TableCell>{p.trackingNumber}</TableCell>
                    <TableCell>{p.destinationBuilding}</TableCell>
                    <TableCell>{formatLocker(p.destinationLocker)}</TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={rowStatus[p.trackingNumber] || p.status}
                        onChange={(e) =>
                          setRowStatus((prev) => ({
                            ...prev,
                            [p.trackingNumber]: e.target.value,
                          }))
                        }
                        aria-label={`Status for ${p.trackingNumber}`}
                      >
                        {MILESTONE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="contained"
                        size="small"
                        onClick={() => handleUpdate(p.trackingNumber)}
                      >
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {deliveryMessage && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {deliveryMessage}
              </Alert>
            )}
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
