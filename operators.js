const STORAGE_KEY = "campusEcoPackages";
const TRACKING_PATTERN = /^PKG[0-9]{4}$/;
const MAX_WEIGHT = 150;

class Package {
  constructor({
    trackingNumber,
    priority,
    destinationBuilding,
    destinationLocker,
    weight,
    length,
    width,
    height,
    status = "AVAILABLE",
    assignedDriver = null,
    createdAt = new Date().toISOString(),
    signedBy = null,
    signedAt = null,
  }) {
    this.trackingNumber = trackingNumber;
    this.priority = priority || "low";
    this.destinationBuilding = destinationBuilding;
    this.destinationLocker = destinationLocker;
    this.weight = weight;
    this.length = length;
    this.width = width;
    this.height = height;
    this.status = status;
    this.assignedDriver = assignedDriver;
    this.createdAt = createdAt;
    this.signedBy = signedBy;
    this.signedAt = signedAt;
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
      destinationBuilding: "CSU",
      destinationLocker: "105",
      weight: 27,
      length: 12,
      width: 10,
      height: 8,
    }),
    new Package({
      trackingNumber: "PKG1012",
      priority: "low",
      destinationBuilding: "Memorial Library",
      destinationLocker: "110",
      weight: 21,
      length: 15,
      width: 12,
      height: 9,
    }),
  ];
}

let packages = loadPackages() || seedPackages();
savePackages(packages);

function readForm() {
  return new Package({
    trackingNumber: $("#tracknum").val().trim().toUpperCase(),
    priority: $('input[name="priority"]:checked').val(),
    destinationBuilding: $("#building").val(),
    destinationLocker: $("#locker").val(),
    weight: parseFloat($("#weight").val()),
    length: parseFloat($("#length").val()),
    width: parseFloat($("#width").val()),
    height: parseFloat($("#height").val()),
  });
}

function validatePackage(pkg) {
  if (!TRACKING_PATTERN.test(pkg.trackingNumber))
    return "Tracking number must be PKG followed by 4 digits.";
  if (packages.some((p) => p.trackingNumber === pkg.trackingNumber))
    return `${pkg.trackingNumber} has already been checked in.`;
  if (
    [pkg.weight, pkg.length, pkg.width, pkg.height].some(
      (n) => isNaN(n) || n <= 0,
    )
  )
    return "Weight and dimensions must be positive numbers.";
  if (pkg.weight > MAX_WEIGHT) return `Weight cannot exceed ${MAX_WEIGHT} lbs.`;
  if (!pkg.destinationBuilding || !pkg.destinationLocker)
    return "Select a building and a locker.";
  return null;
}

function addPackage(pkg) {
  packages.push(pkg);
  savePackages(packages);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildRow(pkg) {
  const cells = [
    ["Tracking Number", pkg.trackingNumber],
    ["Priority", capitalize(pkg.priority)],
    ["Building", pkg.destinationBuilding],
    ["Locker", pkg.destinationLocker],
    ["Weight", pkg.weight + " lbs"],
    ["Length", pkg.length + " in."],
    ["Width", pkg.width + " in."],
    ["Height", pkg.height + " in."],
  ];
  const $row = $("<tr>").addClass("priority-" + pkg.priority);
  cells.forEach(([label, value]) => {
    $("<td>").attr("data-label", label).text(value).appendTo($row);
  });
  return $row;
}

function renderTable() {
  const $body = $("#trackingTable tbody").empty();
  packages.forEach((p) => $body.append(buildRow(p)));
}

function showMessage(text, isError = false) {
  $("#formMessage")
    .stop(true, true)
    .text(text)
    .toggleClass("error", isError)
    .toggleClass("success", !isError)
    .hide()
    .fadeIn(200);
}

$(function () {
  renderTable();

  const $form = $("#packageForm");
  const syncButton = () =>
    $("#submitBtn").prop("disabled", !$form[0].checkValidity());
  $form.on("input change", syncButton);
  syncButton();

  $form.on("submit", function (event) {
    event.preventDefault();
    packages = loadPackages() || [];

    const pkg = readForm();
    const error = validatePackage(pkg);
    if (error) {
      showMessage(error, true);
      return;
    }

    addPackage(pkg);

    renderTable();
    $("#trackingTable tbody tr").last().hide().fadeIn(400);
    showMessage(
      `Package ${pkg.trackingNumber} checked in with status ${pkg.status}.`,
    );
    this.reset();
    syncButton();
  });
});
