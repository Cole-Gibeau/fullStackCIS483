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

function loadPackages() {
  const savedPackages = localStorage.getItem("campusEcoPackages");
  return savedPackages ? JSON.parse(savedPackages) : samplePackages;
}

let packages = loadPackages();

// Convert the package array into JSON text and save it in the browser.
function savePackages() {
  localStorage.setItem("campusEcoPackages", JSON.stringify(packages));
}

// Convert internal status codes into clear display text
function getDisplayStatus(status) {
  if (status === "AVAILABLE") {
    return "Available";
  } else if (status === "CLAIMED") {
    return "Claimed";
  } else if (status === "LOADED") {
    return "Loaded";
  } else if (status === "EN_ROUTE") {
    return "En Route";
  } else if (status === "DELIVERED") {
    return "Delivered";
  } else if (status === "COLLECTED") {
    return "Completed / Signed";
  }
  return status;
}

// Target elements in the DOM
const packagesTableBody = document.querySelector("#packages tbody");
const trackSection = document.getElementById("track");
const trackForm = trackSection.querySelector("form");
const trackInput = document.getElementById("tracknum");

// Create a message paragraph for live tracking results
const trackMessage = document.createElement("p");
trackMessage.setAttribute("role", "status");
trackSection.appendChild(trackMessage);

// Target sign-off form and create its status message
const signoffSection = document.getElementById("signoff");
const signoffForm = signoffSection.querySelector("form");
const signPkgInput = document.getElementById("signpkg");
const signNameInput = document.getElementById("signname");
const receivedCheckbox = document.getElementById("received");

const signoffMessage = document.createElement("p");
signoffMessage.setAttribute("role", "status");
signoffSection.appendChild(signoffMessage);

// Target preferences form and create its status message
const preferencesSection = document.getElementById("preferences");
const preferencesForm = preferencesSection.querySelector("form");
const buildingSelect = document.getElementById("building");
const notifyTransit = document.getElementById("notifyTransit");
const notifyDelivered = document.getElementById("notifyDelivered");

const preferencesMessage = document.createElement("p");
preferencesMessage.setAttribute("role", "status");
preferencesSection.appendChild(preferencesMessage);

// Render the user's packages into the table
function renderPackagesTable() {
  packagesTableBody.innerHTML = "";

  packages.forEach(function (deliveryPackage) {
    const row = packagesTableBody.insertRow();

    row.insertCell().textContent = deliveryPackage.trackingNumber;
    row.insertCell().textContent = deliveryPackage.destinationBuilding;
    row.insertCell().textContent = deliveryPackage.destinationLocker;
    row.insertCell().textContent = deliveryPackage.signedAt
      ? "Delivered / Signed"
      : getDisplayStatus(deliveryPackage.status);
  });
}

// Track a package logic
trackForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const enteredNumber = trackInput.value.trim().toUpperCase();

  const foundPackage = packages.find(function (deliveryPackage) {
    return deliveryPackage.trackingNumber.toUpperCase() === enteredNumber;
  });

  if (!foundPackage) {
    trackMessage.textContent =
      "No package found with tracking number " + enteredNumber + ".";
    return;
  }

  trackMessage.textContent =
    foundPackage.trackingNumber +
    " — " +
    getDisplayStatus(foundPackage.status) +
    ". Destination: " +
    foundPackage.destinationBuilding +
    " (" +
    foundPackage.destinationLocker +
    ").";
});

// Sign for a delivery form
signoffForm.addEventListener("submit", function (event) {
  event.preventDefault();
  packages = loadPackages();
  renderPackagesTable();

  const enteredNumber = signPkgInput.value.trim().toUpperCase();
  const signerName = signNameInput.value.trim();

  const foundPackage = packages.find(function (deliveryPackage) {
    return deliveryPackage.trackingNumber.toUpperCase() === enteredNumber;
  });

  if (!foundPackage) {
    signoffMessage.textContent = "Package " + enteredNumber + " not found.";
    return;
  }

  if (foundPackage.signedAt) {
    signoffMessage.textContent = "This package has already been signed for.";
    return;
  }

  if (!signerName || !receivedCheckbox.checked) {
    signoffMessage.textContent =
      "Enter your name and confirm that you received the package.";
    return;
  }

  if (foundPackage.status !== "DELIVERED") {
    signoffMessage.textContent =
      "Cannot sign off: " +
      foundPackage.trackingNumber +
      " has not been marked Delivered yet (Current status: " +
      getDisplayStatus(foundPackage.status) +
      ").";
    return;
  }

  // Update status to complete and persist
  // Keep the delivery status and record receipt confirmation separately.
  foundPackage.signedBy = signerName;
  foundPackage.signedAt = new Date().toISOString();

  savePackages();
  renderPackagesTable();

  signoffMessage.textContent =
    "Delivery confirmed for " +
    foundPackage.trackingNumber +
    ". Thank you, " +
    signerName +
    "!";

  signoffForm.reset();
});

// Delivery preferences storage logic
const savedPreferences = localStorage.getItem("campusEcoUserPreferences");

if (savedPreferences) {
  const parsedPreferences = JSON.parse(savedPreferences);
  buildingSelect.value = parsedPreferences.building || "";

  if (parsedPreferences.location) {
    const locationRadio = document.querySelector(
      'input[name="location"][value="' + parsedPreferences.location + '"]',
    );
    if (locationRadio) {
      locationRadio.checked = true;
    }
  }

  notifyTransit.checked = parsedPreferences.notifyTransit || false;
  notifyDelivered.checked = parsedPreferences.notifyDelivered || false;
}

preferencesForm.addEventListener("submit", function (event) {
  event.preventDefault();
  packages = loadPackages();
  renderPackagesTable();

  const selectedLocation = document.querySelector(
    'input[name="location"]:checked',
  );

  const userPreferences = {
    building: buildingSelect.value,
    location: selectedLocation ? selectedLocation.value : "room",
    notifyTransit: notifyTransit.checked,
    notifyDelivered: notifyDelivered.checked,
  };

  localStorage.setItem(
    "campusEcoUserPreferences",
    JSON.stringify(userPreferences),
  );
  preferencesMessage.textContent = "Delivery preferences successfully saved!";
});

// Initialize table on page load
renderPackagesTable();
