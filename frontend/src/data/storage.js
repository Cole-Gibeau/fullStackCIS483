export const PACKAGES_KEY = "campusEcoPackages";
export const VEHICLE_KEY = "campusEcoVehicle";
export const PREFERENCES_KEY = "campusEcoUserPreferences";
export const TRACKING_PATTERN = /^PKG[0-9]{4}$/;
export const MAX_WEIGHT = 150;
export const NODE_API_BASE = "http://localhost:3000/api";

export const BUILDINGS = [
  "CSU",
  "Armstrong Hall",
  "Memorial Library",
  "Wissink Hall",
];

export const LOCKERS = [
  { value: "100", label: "L100" },
  { value: "105", label: "L105" },
  { value: "110", label: "L110" },
  { value: "115", label: "L115" },
];

export const DRIVER = {
  driverId: "DRIVER001",
  name: "Demo Driver",
};

const SEED_PACKAGES = [
  {
    trackingNumber: "PKG1001",
    priority: "high",
    destinationBuilding: "CSU",
    destinationLocker: "105",
    weight: 27,
    length: 12,
    width: 10,
    height: 8,
    status: "AVAILABLE",
    assignedDriver: null,
    signedBy: null,
    signedAt: null,
  },
  {
    trackingNumber: "PKG1012",
    priority: "low",
    destinationBuilding: "Memorial Library",
    destinationLocker: "110",
    weight: 21,
    length: 15,
    width: 12,
    height: 9,
    status: "AVAILABLE",
    assignedDriver: null,
    signedBy: null,
    signedAt: null,
  },
];

export function loadPackages() {
  try {
    const raw = localStorage.getItem(PACKAGES_KEY);
    if (raw === null) {
      savePackages(SEED_PACKAGES);
      return [...SEED_PACKAGES];
    }
    return JSON.parse(raw);
  } catch {
    return [...SEED_PACKAGES];
  }
}

export function savePackages(list) {
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(list));
}

export function loadVehicle() {
  try {
    const raw = localStorage.getItem(VEHICLE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { vehicleId: "eCart-12", lowBatteryReported: false };
}

export function saveVehicle(vehicle) {
  localStorage.setItem(VEHICLE_KEY, JSON.stringify(vehicle));
}

export function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    building: "",
    location: "room",
    notifyTransit: false,
    notifyDelivered: false,
  };
}

export function savePreferences(prefs) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
}

export function getDisplayStatus(status) {
  const map = {
    AVAILABLE: "Available",
    CLAIMED: "Claimed",
    LOADED: "Loaded",
    EN_ROUTE: "En Route",
    DELIVERED: "Delivered",
    COLLECTED: "Completed / Signed",
  };
  return map[status] || status;
}

export function formatLocker(locker) {
  if (!locker) return "";
  const value = String(locker);
  return value.startsWith("L") ? value : `L${value}`;
}

export function priorityRowSx(priority) {
  const colors = {
    low: "#f4f4f4",
    medium: "#f3eef8",
    high: "#fff6e8",
    urgent: "#fff0ee",
  };
  return { backgroundColor: colors[priority] || "inherit" };
}
