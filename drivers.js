// Node.js Telemetry & Dispatch Server Base URL
const NODE_API_BASE = "http://localhost:3000/api";
// .NET API Base URL
const API_BASE = "http://localhost:5204/api";

// Sample driver until a login system is added.
const driver = {
  driverId: "DRIVER001",
  name: "Demo Driver",
};

// Packages will be retrieved from the .NET API.
let packages = [];

// Convert the package array into JSON text and save it in the browser.
function savePackages() {
  localStorage.setItem("campusEcoPackages", JSON.stringify(packages));
}

// Helper function to send milestone status updates to the Node.js server
function syncMilestoneWithNode(trackingNumber, status) {
  fetch(`${NODE_API_BASE}/packages/${trackingNumber}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: status,
      driverId: driver.driverId,
      cartId: vehicle.vehicleId,
    }),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      console.log("Node.js milestone logged:", data);
    })
    .catch(function (error) {
      console.warn("Node.js server unreachable (saved locally):", error);
    });
}

// Fill Available Orders using packages from the .NET API
const availableOrders = document.getElementById("availableOrders");

async function loadPackages() {
  try {
    const response = await fetch(`${API_BASE}/packages`);

    if (!response.ok) {
      throw new Error("Failed to retrieve packages.");
    }

    packages = await response.json();

    $("#availableOrders").empty();
    $("#availableOrders").append(
      '<option value="">Select an available package</option>'
    );

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
            deliveryPackage.destinationBuilding
        )
        .appendTo("#availableOrders");
    });

  } catch (error) {
    console.error("Could not load packages:", error);

    $("#availableOrders").html(
      '<option value="">Could not load packages</option>'
    );
  }
}

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

  
updateButton.on("click", async function () {
  const newStatus = statusDropdown.val();
  const previousStatus = deliveryPackage.status;

  try {
    const response = await fetch(
      `${API_BASE}/packages/${deliveryPackage.trackingNumber}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Failed to update package status."
      );
    }

    // Update the local display after the database confirms success.
    deliveryPackage.status = newStatus;

    // Log the milestone with the Node.js dispatch server.
    syncMilestoneWithNode(
      deliveryPackage.trackingNumber,
      newStatus
    );

    $("#deliveryMessage").text(
      `${deliveryPackage.trackingNumber} updated to ${newStatus}.`
    );

    // Remove completed deliveries from the active schedule.
    if (newStatus === "DELIVERED") {
      row.remove();
    }

  } catch (error) {
    console.error("Could not update package:", error);

    // Restore the previous status if the API rejects the update.
    statusDropdown.val(previousStatus);

    $("#deliveryMessage").text(error.message);
  }
});


  $("#activeDeliveriesBody").append(row);
}


claimOrderButton.addEventListener("click", async function () {
  const selectedPackage = packages.find(function (deliveryPackage) {
    return deliveryPackage.trackingNumber === availableOrders.value;
  });

  if (!selectedPackage) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/packages/${selectedPackage.trackingNumber}/claim`,
      {
        method: "POST",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to claim package.");
    }

    // Update the local display after the database confirms the claim.
    selectedPackage.status = "CLAIMED";
    selectedPackage.assignedDriver = driver.driverId;

    addDeliveryRow(selectedPackage);

    // Log the claim with the Node.js dispatch server.
    syncMilestoneWithNode(
      selectedPackage.trackingNumber,
      "CLAIMED"
    );

    $("#deliveryMessage").text(
      `Package ${selectedPackage.trackingNumber} successfully claimed.`
    );

    // Reload available packages from the .NET API.
    await loadPackages();

  } catch (error) {
    console.error("Could not claim package:", error);
    $("#deliveryMessage").text(error.message);
  }
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

// Restore the reported state on initial page load if already reported
if (vehicle.lowBatteryReported) {
  batteryMessage.textContent =
    "Low battery reported for " + vehicle.vehicleId + ".";
  reportBatteryButton.textContent = "Battery Reported";
  reportBatteryButton.disabled = true;
}

// Record a battery report locally and dispatch alert to Node.js server
reportBatteryButton.addEventListener("click", function () {
  vehicle.lowBatteryReported = true;
  localStorage.setItem("campusEcoVehicle", JSON.stringify(vehicle));

  // Send low-battery alert to Node.js telemetry endpoint
  fetch(`${NODE_API_BASE}/alerts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "LOW_BATTERY",
      cartId: vehicle.vehicleId,
      message: `Low battery reported for ${vehicle.vehicleId} by ${driver.driverId}`,
    }),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      console.log("Node.js low-battery alert logged:", data);
    })
    .catch(function (error) {
      console.warn("Node.js server unreachable (saved locally):", error);
    });

  batteryMessage.textContent =
    "Low battery reported for " + vehicle.vehicleId + ".";

  // Disable the button to prevent repeat reports until the page refreshes
  reportBatteryButton.textContent = "Battery Reported";
  reportBatteryButton.disabled = true;
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

// Poll live cart telemetry from Node.js server 
function pollTelemetry() {
  fetch(`${NODE_API_BASE}/telemetry`)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      const activeCart = data.carts.find(function (c) {
        return c.cartId === vehicle.vehicleId;
      });
      if (activeCart) {
        console.log(
          `[Node Telemetry] ${activeCart.cartId} | Location: ${activeCart.location} | Battery: ${activeCart.batteryPct}%`,
        );
      }
    })
    .catch(function () {
      // Ignore polling errors when Node.js server is offline
    });
}

pollTelemetry();
setInterval(pollTelemetry, 5000);
loadPackages();