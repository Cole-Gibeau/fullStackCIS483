// Starting data used when no packages have been saved in this browser
const samplePackages = [
  {
    trackingNumber: "PKG1001",
    destinationBuilding: "CSU",
    destinationLocker: "L105",
    status: "AVAILABLE",
    assignedDriver: null,
  },
  {
    trackingNumber: "PKG1002",
    destinationBuilding: "Preska",
    destinationLocker: "L104",
    status: "AVAILABLE",
    assignedDriver: null,
  },
];

// Sample driver until a login system is added.
const driver = {
  driverId: "DRIVER001",
  name: "Demo Driver",
};

// Load saved packages or use the sample data on the first visit
const savedPackages = localStorage.getItem("campusEcoPackages");
const packages = savedPackages ? JSON.parse(savedPackages) : samplePackages;

// Convert the package array into JSON text and save it in the browser.
function savePackages() {
  localStorage.setItem("campusEcoPackages", JSON.stringify(packages));
}

// Fill the Available Orders dropdown
const availableOrders = document.getElementById("availableOrders");

packages.forEach(function (deliveryPackage) {
  if (deliveryPackage.status !== "AVAILABLE") {
    return;
  }

  $("<option>")
    .val(deliveryPackage.trackingNumber)
    .text(
      deliveryPackage.trackingNumber +
        " - " +
        deliveryPackage.destinationLocker +
        " - " +
        deliveryPackage.destinationBuilding,
    )
    .appendTo("#availableOrders");
});

// Claim Order Button Logic
// Enable Claim Delivery when a package is selected.
// Selecting the empty placeholder disables the button
const claimOrderButton = document.getElementById("claimOrder");

$("#availableOrders").on("change", function () {
  $("#claimOrder").prop("disabled", $(this).val() === "");
});

const activeDeliveriesBody = document.getElementById("activeDeliveriesBody");
const deliveryMessage = document.getElementById("deliveryMessage");

// Create a table row for a newly claimed or previously saved package
// Build a delivery row using jQuery.
function addDeliveryRow(deliveryPackage) {
  const row = $("<tr>");

  $("<td>").text(deliveryPackage.trackingNumber).appendTo(row);
  $("<td>").text(deliveryPackage.destinationBuilding).appendTo(row);
  $("<td>").text(deliveryPackage.destinationLocker).appendTo(row);

  const statusDropdown = $("<select>").attr(
    "aria-label",
    "Status for " + deliveryPackage.trackingNumber,
  );

  const statuses = {
    CLAIMED: "Claimed",
    LOADED: "Loaded",
    EN_ROUTE: "En Route",
    DELIVERED: "Delivered",
  };

  Object.entries(statuses).forEach(function ([value, label]) {
    $("<option>").val(value).text(label).appendTo(statusDropdown);
  });

  statusDropdown.val(deliveryPackage.status);
  $("<td>").append(statusDropdown).appendTo(row);

  const updateButton = $("<button>").attr("type", "button").text("Update");

  $("<td>").append(updateButton).appendTo(row);

  updateButton.on("click", function () {
    deliveryPackage.status = statusDropdown.val();
    savePackages();

    $("#deliveryMessage").text(
      deliveryPackage.trackingNumber +
        " updated to " +
        statusDropdown.find("option:selected").text() +
        ".",
    );

    // Hide completed deliveries while retaining their saved records.
    if (deliveryPackage.status === "DELIVERED") {
      row.remove();
    }
  });

  $("#activeDeliveriesBody").append(row);
}

claimOrderButton.addEventListener("click", function () {
  const selectedPackage = packages.find(function (deliveryPackage) {
    return deliveryPackage.trackingNumber === availableOrders.value;
  });

  if (!selectedPackage) {
    return;
  }

  selectedPackage.status = "CLAIMED";
  selectedPackage.assignedDriver = driver.driverId;
  savePackages();
  addDeliveryRow(selectedPackage);

  availableOrders.selectedOptions[0].remove();
  availableOrders.value = "";
  claimOrderButton.disabled = true;
});

// Report Low Battery Button Logic

const savedVehicle = localStorage.getItem("campusEcoVehicle");

const vehicle = savedVehicle
  ? JSON.parse(savedVehicle)
  : {
      vehicleId: "eCart-12",
      lowBatteryReported: false,
    };

document.getElementById("vehicleId").textContent = vehicle.vehicleId;
document.getElementById("cartid").value = vehicle.vehicleId;

const reportBatteryButton = document.getElementById("reportBattery");
const batteryMessage = document.getElementById("batteryMessage");

// Record a local battery report and display confirmation.
reportBatteryButton.addEventListener("click", function () {
  vehicle.lowBatteryReported = true;
  localStorage.setItem("campusEcoVehicle", JSON.stringify(vehicle));

  batteryMessage.textContent =
    "Low battery reported for " + vehicle.vehicleId + ".";

  // Disable the button to prevent repeat reports until the page refreshes
  reportBatteryButton.textContent = "Battery Reported";
  reportBatteryButton.disabled = true;
  // Restore the reported state after refreshing.
  if (vehicle.lowBatteryReported) {
    batteryMessage.textContent =
      "Low battery reported for " + vehicle.vehicleId + ".";

    reportBatteryButton.textContent = "Battery Reported";
    reportBatteryButton.disabled = true;
  }
});

// Restore saved packages to the table when the page loads
// Restore this driver's unfinished deliveries.
packages.forEach(function (deliveryPackage) {
  if (
    deliveryPackage.status !== "AVAILABLE" &&
    deliveryPackage.status !== "DELIVERED" &&
    deliveryPackage.assignedDriver === driver.driverId
  ) {
    addDeliveryRow(deliveryPackage);
  }
});

// Animate the vehicle panel opening and closing.
$("#toggleVehicle").on("click", function () {
  const expanded = $(this).attr("aria-expanded") === "true";

  $("#vehicleDetails").stop(true, true).slideToggle(200);

  $(this)
    .attr("aria-expanded", String(!expanded))
    .text(expanded ? "Show Vehicle Details" : "Hide Vehicle Details");
});
