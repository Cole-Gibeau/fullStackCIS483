const API_BASE = "http://localhost:5204/api";
const TRACKING_PATTERN = /^PKG[0-9]{4}$/;
const MAX_WEIGHT = 150;

async function loadRecipients() {
  try {
    const response = await fetch(`${API_BASE}/recipients`);

    if (!response.ok) {
      throw new Error("Failed to load recipients.");
    }

    const recipients = await response.json();
    const $recipient = $("#recipient");

    $recipient.empty();
    $recipient.append('<option value="">Select a recipient</option>');

    recipients.forEach((recipient) => {
      $recipient.append(
        $("<option>")
          .val(recipient.recipientUserId)
          .text(recipient.fullName)
      );
    });
  } catch (error) {
    console.error(error);
    $("#recipient").html('<option value="">Could not load recipients</option>');
  }
}

let availableLockers = [];

async function loadLockers() {
  try {
    const response = await fetch(`${API_BASE}/lockers`);

    if (!response.ok) {
      throw new Error("Failed to load lockers.");
    }

    availableLockers = await response.json();
    loadBuildings();
  } catch (error) {
    console.error(error);
    $("#building").html('<option value="">Could not load buildings</option>');
    $("#locker").html('<option value="">Could not load lockers</option>');
  }
}

function loadBuildings() {
  const buildings = [
    ...new Set(availableLockers.map((locker) => locker.buildingName)),
  ];

  const $building = $("#building");
  $building.empty();
  $building.append('<option value="">Select a building</option>');

  buildings.forEach((building) => {
    $building.append(
      $("<option>").val(building).text(building)
    );
  });
}

function loadBuildingLockers(buildingName) {
  const $locker = $("#locker");
  $locker.empty();

  if (!buildingName) {
    $locker.append('<option value="">Select a building first</option>');
    return;
  }

  const lockers = availableLockers.filter(
    (locker) => locker.buildingName === buildingName
  );

  $locker.append('<option value="">Select a locker</option>');

  lockers.forEach((locker) => {
    $locker.append(
      $("<option>")
        .val(locker.lockerId)
        .text(locker.lockerNumber)
    );
  });
}




async function loadPackages() {
  try {
    const response = await fetch(`${API_BASE}/packages`);

    if (!response.ok) {
      throw new Error("Failed to load packages.");
    }

    packages = await response.json();

    renderTable();

  } catch (error) {
    console.error("Could not load packages:", error);
    showMessage("Could not load packages from the server.", true);
  }
}

let packages = [];

function readForm() {
  return {
    trackingNumber: $("#tracknum").val().trim().toUpperCase(),
    recipientUserId: Number($("#recipient").val()),
    lockerId: Number($("#locker").val()),
    priority: $('input[name="priority"]:checked').val(),
    weightLbs: parseFloat($("#weight").val()),
    lengthIn: parseFloat($("#length").val()),
    widthIn: parseFloat($("#width").val()),
    heightIn: parseFloat($("#height").val()),
  };
}


function validatePackage(pkg) {
  if (!TRACKING_PATTERN.test(pkg.trackingNumber)) {
    return "Tracking number must be PKG followed by 4 digits.";
  }

  if (packages.some((p) => p.trackingNumber === pkg.trackingNumber)) {
    return `${pkg.trackingNumber} has already been checked in.`;
  }

  if (
    [pkg.weightLbs, pkg.lengthIn, pkg.widthIn, pkg.heightIn].some(
      (n) => isNaN(n) || n <= 0
    )
  ) {
    return "Weight and dimensions must be positive numbers.";
  }

  if (pkg.weightLbs > MAX_WEIGHT) {
    return `Weight cannot exceed ${MAX_WEIGHT} lbs.`;
  }

  if (!pkg.recipientUserId || !pkg.lockerId) {
    return "Select a recipient and a locker.";
  }

  return null;
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
    ["Weight", pkg.weightLbs != null ? pkg.weightLbs + " lbs" : "—"],
    ["Length", pkg.lengthIn != null ? pkg.lengthIn + " in." : "—"],
    ["Width", pkg.widthIn != null ? pkg.widthIn + " in." : "—"],
    ["Height", pkg.heightIn != null ? pkg.heightIn + " in." : "—"],
  ];

  const $row = $("<tr>").addClass("priority-" + pkg.priority);

  cells.forEach(([label, value]) => {
    $("<td>")
      .attr("data-label", label)
      .text(value ?? "—")
      .appendTo($row);
  });

  return $row;
}


function renderTable() {
  const $tbody = $("#trackingTable tbody");
  $tbody.empty();

  packages.forEach((pkg) => {
    $tbody.append(buildRow(pkg));
  });
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
loadPackages();
loadRecipients();
loadLockers();

  $("#building").on("change", function () {
    loadBuildingLockers($(this).val());
  });

  const $form = $("#packageForm");
  const syncButton = () =>
    $("#submitBtn").prop("disabled", !$form[0].checkValidity());
  $form.on("input change", syncButton);
  syncButton();

  
$form.on("submit", async function (event) {
  event.preventDefault();

  const pkg = readForm();
  const error = validatePackage(pkg);

  if (error) {
    showMessage(error, true);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/packages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pkg),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to create package.");
    }

    showMessage(
      `Package ${result.trackingNumber} successfully checked in.`
    );

    this.reset();
    syncButton();

    await loadPackages();
    renderTable();

  } catch (error) {
    console.error("Could not create package:", error);
    showMessage(error.message, true);
  }
});
});
