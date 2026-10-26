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

function readForm() {
  return new Package({
    trackingNumber: $("#tracknum").val().trim().toUpperCase(),
    priority: $('input[name="priority"]:checked').val(),
    building: $("#building").val(),
    locker: $("#locker").val(),
    weight: parseFloat($("#weight").val()),
    length: parseFloat($("#length").val()),
    width: parseFloat($("#width").val()),
    height: parseFloat($("#height").val()),
  });
}

function validatePackage(pkg) {
  if (!TRACKING_PATTERN.test(pkg.trackingNumber))
    return "Tracking number must be PKG followed by 4 digits.";
  if (packages.some(p => p.trackingNumber === pkg.trackingNumber))
    return `${pkg.trackingNumber} has already been checked in.`;
  if ([pkg.weight, pkg.length, pkg.width, pkg.height].some(n => isNaN(n) || n <= 0))
    return "Weight and dimensions must be positive numbers.";
  if (pkg.weight > MAX_WEIGHT)
    return `Weight cannot exceed ${MAX_WEIGHT} lbs.`;
  if (!pkg.building || !pkg.locker)
    return "Select a building and a locker.";
  return null;
}

function addPackage(pkg) {
  packages.push(pkg);
  savePackages(packages);   
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function buildRow(pkg) {
  const cells = [
    ["Tracking Number", pkg.trackingNumber],
    ["Priority", capitalize(pkg.priority)],
    ["Building", pkg.building],
    ["Locker", "L" + pkg.locker],
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
  packages.forEach(p => $body.append(buildRow(p)));
}

function showMessage(text, isError = false) {
  $("#formMessage").stop(true, true)
    .text(text)
    .toggleClass("error", isError)
    .toggleClass("success", !isError)
    .hide().fadeIn(200);
}

$(function () {
  renderTable();

  const $form = $("#packageForm");
  const syncButton = () => $("#submitBtn").prop("disabled", !$form[0].checkValidity());
  $form.on("input change", syncButton);
  syncButton();

  $form.on("submit", function (event) {
    event.preventDefault();

    const pkg = readForm();
    const error = validatePackage(pkg);
    if (error) {
      showMessage(error, true);
      return;
    }

    addPackage(pkg);

    const $row = buildRow(pkg).hide();
    $("#trackingTable tbody").append($row);
    $row.fadeIn(400);

    showMessage(`Package ${pkg.trackingNumber} checked in with status ${pkg.status}.`);
    this.reset();
    syncButton();
  });
});

