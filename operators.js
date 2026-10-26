const STORAGE_KEY = "campusEcoPackages";
const TRACKING_PATTERN = /^PKG[0-9]{4}$/;
const MAX_WEIGHT = 150;

class Package {
  constructor({
    trackingNumber, priority, building, locker, weight, length, width, height,
    status = "AVAILABLE", createdAt = new Date().toISOString(),
  }) {
    this.trackingNumber = trackingNumber;
    this.priority = priority;
    this.building = building;
    this.locker = locker;
    this.weight = weight;
    this.length = length;
    this.width = width;
    this.height = height;
    this.status = status;
    this.createdAt = createdAt;
  }
}

function loadPackages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw).map((p) => new Package(p));
  } catch (e) {
    console.error("Could not read saved packages", e);
    return [];
  }
}

function savePackages(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Could not save packages", e);
  }
}

function seedPackages() {
  return [
    new Package({
      trackingNumber: "PKG1001",
      priority: "high",
      building: "CSU",
      locker: "105",
      weight: 27,
      length: 12,
      width: 10,
      height: 8,
    }),
    new Package({
      trackingNumber: "PKG1012",
      priority: "low",
      building: "Memorial Library",
      locker: "110",
      weight: 21,
      length: 15,
      width: 12,
      height: 9,
    }),
  ];
}

let packages = loadPackages() || seedPackages();
savePackages(packages);