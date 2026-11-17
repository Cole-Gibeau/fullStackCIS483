const API_BASE = "http://localhost:5204/api";

let packages = [];

// Retrieve the current packages from the .NET API
async function loadPackages() {
  try {
    const response = await fetch(`${API_BASE}/packages`);

    if (!response.ok) {
      throw new Error("Failed to load packages from the server.");
    }

    packages = await response.json();
    renderPackagesTable();

  } catch (error) {
    console.error("Could not load packages:", error);
    trackMessage.textContent =
      "Unable to load package information. Please try again later.";
  }
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


// Track a package using the .NET API
trackForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const enteredNumber = trackInput.value.trim().toUpperCase();

  if (!enteredNumber) {
    trackMessage.textContent = "Please enter a tracking number.";
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/packages/${encodeURIComponent(enteredNumber)}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Package not found."
      );
    }

    const history = result.history || [];

    const historyText = history.length
      ? history.map(function (event) {
          return getDisplayStatus(event.status);
        }).join(" → ")
      : "No transit history available.";

    trackMessage.textContent =
      result.trackingNumber +
      " — " +
      getDisplayStatus(result.status) +
      ". Destination: " +
      result.destinationBuilding +
      " (" +
      result.destinationLocker +
      "). History: " +
      historyText;

  } catch (error) {
    console.error("Tracking request failed:", error);
    trackMessage.textContent = error.message;
  }
});



// Sign for a delivery using the .NET API
signoffForm.addEventListener("submit", async function (event) {
  event.preventDefault();

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
      "Cannot sign off: package must be marked Delivered first. Current status: " +
      getDisplayStatus(foundPackage.status) + ".";
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/packages/${encodeURIComponent(enteredNumber)}/confirmation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedName: signerName,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Delivery confirmation failed.");
    }

    foundPackage.signedBy = result.signedName;
    foundPackage.signedAt = new Date().toISOString();

    renderPackagesTable();

    signoffMessage.textContent =
      "Delivery confirmed for " +
      enteredNumber +
      ". Thank you, " +
      signerName +
      "!";

    signoffForm.reset();

  } catch (error) {
    console.error("Delivery confirmation failed:", error);
    signoffMessage.textContent = error.message;
  }
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

// Load packages from the API when the page opens
loadPackages();
