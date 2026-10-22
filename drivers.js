const packages = [
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

const availableOrders = document.getElementById("availableOrders");

packages.forEach(function (deliveryPackage) {
  const option = document.createElement("option");

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
const claimOrderButton = document.getElementById("claimOrder");

availableOrders.addEventListener("change", function () {
  claimOrderButton.disabled = availableOrders.value === "";
});

const claimedOrders = document.getElementById("claimedOrders");

claimOrderButton.addEventListener("click", function () {
  const selectedPackage = packages.find(function (deliveryPackage) {
    return deliveryPackage.trackingNumber === availableOrders.value;
  });

  if (!selectedPackage) {
    return;
  }

  selectedPackage.status = "CLAIMED";

  const selectedOption = availableOrders.selectedOptions[0];
  claimedOrders.appendChild(selectedOption);

  availableOrders.value = "";
  claimOrderButton.disabled = true;
});

//Update Transit Milestones Logic
const deliveryForm = document.getElementById("deliveryForm");
const statusSelect = document.getElementById("status");

deliveryForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const selectedPackage = packages.find(function (deliveryPackage) {
    return deliveryPackage.trackingNumber === claimedOrders.value;
  });

  if (!selectedPackage) {
    return;
  }

  selectedPackage.status = statusSelect.value;

  console.log(selectedPackage);
});
