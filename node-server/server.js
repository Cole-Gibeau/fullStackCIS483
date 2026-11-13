const express = require("express");
const cors = require("cors");
const { DatabaseSync } = require("node:sqlite");

const app = express();
const PORT = process.env.PORT || 3000;

// Allow cross-origin requests from Live Server (:5500) or PHP/Apache (:8080)
app.use(cors());
// Automatically parse incoming JSON payloads into req.body
app.use(express.json());

// 1. PERSISTENT SQLITE DATABASE FOR TELEMETRY & DISPATCH ALERTS
const db = new DatabaseSync("telemetry.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    cart_id TEXT,
    tracking_no TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

// 2. CAMPUS FLEET & ROUTE STREAM STATE
const campusStops = [
  "Central Hub",
  "CSU",
  "Preska",
  "Armstrong Hall",
  "Memorial Library",
  "Wissink Hall"
];

let fleetTelemetry = [
  {
    cartId: "eCart-12",
    driverId: "DRIVER001",
    batteryPct: 92,
    location: "Central Hub",
    status: "AVAILABLE",
    lowBatteryReported: false,
    updatedAt: new Date().toISOString()
  },
  {
    cartId: "eCart-08",
    driverId: "DRIVER002",
    batteryPct: 68,
    location: "Preska",
    status: "EN_ROUTE",
    lowBatteryReported: false,
    updatedAt: new Date().toISOString()
  }
];

// High-velocity background telemetry ticker
setInterval(() => {
  fleetTelemetry.forEach((cart) => {
    // Gradually drain battery
    if (cart.batteryPct > 12) {
      cart.batteryPct -= 1;
    }

    // Automatically log a dispatch alert if battery hits 20%
    if (cart.batteryPct === 20 && !cart.lowBatteryReported) {
      cart.lowBatteryReported = true;
      const msg = `Automated Telemetry Alert: ${cart.cartId} battery dropped to 20%`;
      db.prepare(
        "INSERT INTO alerts (type, cart_id, message, created_at) VALUES (?, ?, ?, ?)"
      ).run("LOW_BATTERY", cart.cartId, msg, new Date().toISOString());
      console.log(`[AUTO ALERT] ${msg}`);
    }

    // Simulate cart movement across campus buildings
    const nextStop = campusStops[Math.floor(Math.random() * campusStops.length)];
    cart.location = nextStop;
    cart.updatedAt = new Date().toISOString();
  });
}, 5000);

// 3. REST API ENDPOINTS
app.get("/", (req, res) => {
  res.json({
    service: "MNSU-CampusEco Node.js Telemetry & Dispatch Runtime",
    status: "ONLINE"
  });
});

app.get("/api/telemetry", (req, res) => {
  res.status(200).json({
    timestamp: new Date().toISOString(),
    carts: fleetTelemetry
  });
});

app.get("/api/routes/stream", (req, res) => {
  const routeClusters = {
    CSU: ["L105"],
    Preska: ["L104"],
    "Memorial Library": ["L110"],
    "Armstrong Hall": ["L100"],
    "Wissink Hall": ["L115"]
  };

  res.status(200).json({
    hubOrigin: "MNSU Perimeter Logistics Hub",
    activeZones: routeClusters,
    activeFleetCount: fleetTelemetry.length
  });
});

app.patch("/api/packages/:tracking/status", (req, res) => {
  const trackingNo = req.params.tracking.toUpperCase();
  const { status, driverId, cartId } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Missing 'status' in JSON body." });
  }

  const msg = `Package ${trackingNo} updated to ${status} by ${driverId || "Courier"} (${cartId || "eCart-12"})`;

  db.prepare(
    "INSERT INTO alerts (type, cart_id, tracking_no, message, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run("MILESTONE_UPDATE", cartId || "eCart-12", trackingNo, msg, new Date().toISOString());

  console.log(`[DISPATCH] ${msg}`);

  res.status(200).json({
    success: true,
    trackingNumber: trackingNo,
    status,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/alerts", (req, res) => {
  const { type, cartId, trackingNo, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Alert 'message' is required." });
  }

  if (type === "LOW_BATTERY" && cartId) {
    const cart = fleetTelemetry.find((c) => c.cartId === cartId);
    if (cart) {
      cart.lowBatteryReported = true;
      cart.batteryPct = 15;
    }
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      "INSERT INTO alerts (type, cart_id, tracking_no, message, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(type || "DISPATCH_ALERT", cartId || null, trackingNo || null, message, now);

  console.log(`[ALERT #${result.lastInsertRowid}] ${message}`);

  res.status(201).json({
    saved: true,
    alertId: Number(result.lastInsertRowid),
    timestamp: now
  });
});

app.get("/api/alerts", (req, res) => {
  const rows = db.prepare("SELECT * FROM alerts ORDER BY id DESC LIMIT 20").all();
  res.status(200).json(rows);
});

// 4. START THE SERVER
app.listen(PORT, () => {
  console.log(`MNSU-CampusEco Node.js server listening on http://localhost:${PORT}`);
});