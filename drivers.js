// Starting data used when no packages have been saved in this browser
const samplePackages = [
  {
    trackingNumber: "PKG1001",
    destinationBuilding: "CSU",
    destinationLocker: "L105",
    status: "AVAILABLE",
  },
  {
    trackingNumber: "PKG1002",
    destinationBuilding: "Preska",
    destinationLocker: "L104",
    status: "AVAILABLE",
  },
];
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

  const option = document.createElement("option");

  // Store the tracking number as the value and show the destination details.
  option.value = deliveryPackage.trackingNumber;
  option.textContent =
    deliveryPackage.trackingNumber +
    " - " +
    deliveryPackage.destinationLocker +
    " - " +
    deliveryPackage.destinationBuilding;

  availableOrders.appendChild(option);
});

// Claim Order Button Logic
// Enable Claim Delivery when a package is selected.
// Selecting the empty placeholder disables the button
const claimOrderButton = document.getElementById("claimOrder");

availableOrders.addEventListener("change", function () {
  claimOrderButton.disabled = availableOrders.value === "";
});

const activeDeliveriesBody = document.getElementById("activeDeliveriesBody");
const deliveryMessage = document.getElementById("deliveryMessage");

// Create a table row for a newly claimed or previously saved package
function addDeliveryRow(deliveryPackage) {
  const row = activeDeliveriesBody.insertRow();

  row.insertCell().textContent = deliveryPackage.trackingNumber;
  row.insertCell().textContent = deliveryPackage.destinationBuilding;
  row.insertCell().textContent = deliveryPackage.destinationLocker;

  // Create a separate status dropdown for this package
  const statusCell = row.insertCell();
  const statusDropdown = document.createElement("select");

  // Give screen readers a label identifying the package being updated
  statusDropdown.setAttribute(
    "aria-label",
    "Status for " + deliveryPackage.trackingNumber,
  );

  statusDropdown.innerHTML = `
    <option value="CLAIMED">Claimed</option>
    <option value="LOADED">Loaded</option>
    <option value="EN_ROUTE">En Route</option>
    <option value="DELIVERED">Delivered</option>
  `;

  statusDropdown.value = deliveryPackage.status;
  statusCell.appendChild(statusDropdown);

  const actionCell = row.insertCell();
  const updateButton = document.createElement("button");

  updateButton.type = "button";
  updateButton.textContent = "Update";
  actionCell.appendChild(updateButton);

  updateButton.addEventListener("click", function () {
    deliveryPackage.status = statusDropdown.value;
    savePackages();

    const statusText = statusDropdown.selectedOptions[0].textContent;

    deliveryMessage.textContent =
      deliveryPackage.trackingNumber + " updated to " + statusText + ".";
  });
}

claimOrderButton.addEventListener("click", function () {
  const selectedPackage = packages.find(function (deliveryPackage) {
    return deliveryPackage.trackingNumber === availableOrders.value;
  });

  if (!selectedPackage) {
    return;
  }

  selectedPackage.status = "CLAIMED";
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

  batteryMessage.textContent =
    "Low battery reported for " + vehicle.vehicleId + ".";

  // Disable the button to prevent repeat reports until the page refreshes
  reportBatteryButton.textContent = "Battery Reported";
  reportBatteryButton.disabled = true;
});

// Restore saved packages to the table when the page loads
// Currently includes all non-available packages, including delivered ones
packages.forEach(function (deliveryPackage) {
  if (deliveryPackage.status !== "AVAILABLE") {
    addDeliveryRow(deliveryPackage);
  }
});
