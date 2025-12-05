// Configuration
const API_URL = "http://localhost:5000/api";
let allFlights = [];
let gateAssignments = {};

// Initialize on page load
$(document).ready(function () {
  checkAuth();
  loadGatesAndFlights();
});

// Check authentication
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../auth/login.html";
    return;
  }
}

// Get auth token
function getAuthToken() {
  return localStorage.getItem("token");
}

// Load gates and flights
function loadGatesAndFlights() {
  // Load all flights to get gate assignments
  $.ajax({
    url: `${API_URL}/flights`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    data: { limit: 100 }, // Get all flights
    success: function (response) {
      allFlights = response.flights || [];
      processGateAssignments();
      renderGates();
      updateStatistics();

      // Hide loading, show content
      $("#loadingContainer").hide();
      $("#gateStats").fadeIn();
      $("#gateLegend").fadeIn();
      $("#terminalA").fadeIn();
      $("#terminalB").fadeIn();
      $("#terminalC").fadeIn();
    },
    error: function (xhr) {
      console.error("Error loading data:", xhr);
      $("#loadingContainer").html(`
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    Failed to load gate information. Please refresh.
                </div>
            `);
    },
  });
}

// Process gate assignments from flights
function processGateAssignments() {
  gateAssignments = {};

  allFlights.forEach(function (flight) {
    if (
      flight.gate &&
      flight.status !== "departed" &&
      flight.status !== "cancelled"
    ) {
      gateAssignments[flight.gate] = {
        flightNumber: flight.flightNumber,
        destination: flight.destination,
        departureTime: flight.departureTime,
        status: flight.status,
        flightId: flight._id,
      };
    }
  });
}

// Render all gates
function renderGates() {
  // Terminal A: A1-A10
  renderTerminalGates("A", 10, "#terminalAGates");

  // Terminal B: B1-B10
  renderTerminalGates("B", 10, "#terminalBGates");

  // Terminal C: C1-C10
  renderTerminalGates("C", 10, "#terminalCGates");
}

// Render gates for a specific terminal
function renderTerminalGates(terminal, count, containerId) {
  const container = $(containerId);
  container.empty();

  for (let i = 1; i <= count; i++) {
    const gateNumber = `${terminal}${i}`;
    const gateCard = createGateCard(gateNumber);
    container.append(gateCard);
  }
}

// Create gate card
function createGateCard(gateNumber) {
  const assignment = gateAssignments[gateNumber];

  let statusClass = "available";
  let statusText = "Available";
  let icon = "fa-check-circle";
  let flightInfo = "";

  if (assignment) {
    statusClass = "occupied";
    statusText = "Occupied";
    icon = "fa-plane";

    const time = formatTime(assignment.departureTime);
    flightInfo = `
            <div class="gate-flight">${assignment.flightNumber}</div>
            <div class="gate-time">to ${assignment.destination}</div>
            <div class="gate-time">${time}</div>
        `;
  }

  return `
        <div class="gate-card ${statusClass}" onclick="openGateModal('${gateNumber}')">
            <i class="fas ${icon} gate-icon"></i>
            <div class="gate-number">${gateNumber}</div>
            <div class="gate-status">${statusText}</div>
            ${flightInfo}
        </div>
    `;
}

// Format time
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Update statistics
function updateStatistics() {
  const totalGates = 30;
  const occupiedGates = Object.keys(gateAssignments).length;
  const availableGates = totalGates - occupiedGates;
  const maintenanceGates = 0; // Can be extended later

  $("#totalGates").text(totalGates);
  $("#occupiedGates").text(occupiedGates);
  $("#availableGates").text(availableGates);
  $("#maintenanceGates").text(maintenanceGates);
}

// Open gate modal
function openGateModal(gateNumber) {
  $("#selectedGate").val(gateNumber);
  $("#modalTitle").text(`Gate ${gateNumber}`);

  const assignment = gateAssignments[gateNumber];

  if (assignment) {
    // Gate is occupied - show info and unassign option
    $("#gateInfo").html(`
            <div class="alert alert-info">
                <h6><strong>Current Assignment:</strong></h6>
                <p class="mb-1"><strong>Flight:</strong> ${
                  assignment.flightNumber
                }</p>
                <p class="mb-1"><strong>Destination:</strong> ${
                  assignment.destination
                }</p>
                <p class="mb-1"><strong>Departure:</strong> ${formatDateTime(
                  assignment.departureTime
                )}</p>
                <p class="mb-0"><strong>Status:</strong> <span class="badge bg-primary">${
                  assignment.status
                }</span></p>
            </div>
        `);
    $("#assignmentForm").hide();
    $("#assignBtn").hide();
    $("#unassignBtn").show();
  } else {
    // Gate is available - show assign option
    $("#gateInfo").html(`
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> This gate is currently available for assignment.
            </div>
        `);

    loadAvailableFlights();
    $("#assignmentForm").show();
    $("#assignBtn").show();
    $("#unassignBtn").hide();
  }

  $("#gateModal").modal("show");
}

// Load available flights (without gate or can reassign)
function loadAvailableFlights() {
  const select = $("#flightSelect");
  select.empty();
  select.append('<option value="">Choose a flight...</option>');

  allFlights.forEach(function (flight) {
    if (flight.status !== "departed" && flight.status !== "cancelled") {
      select.append(`
                <option value="${flight._id}">
                    ${flight.flightNumber} - ${flight.origin} to ${
        flight.destination
      } (${formatTime(flight.departureTime)})
                </option>
            `);
    }
  });
}

// Assign gate to flight
function assignGate() {
  const gateNumber = $("#selectedGate").val();
  const flightId = $("#flightSelect").val();

  if (!flightId) {
    showError("Please select a flight");
    return;
  }

  // Update flight with new gate
  $.ajax({
    url: `${API_URL}/flights/${flightId}`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify({ gate: gateNumber }),
    success: function (response) {
      $("#gateModal").modal("hide");
      showSuccess(`Gate ${gateNumber} assigned successfully!`);

      // Reload
      setTimeout(function () {
        loadGatesAndFlights();
      }, 1000);
    },
    error: function (xhr) {
      console.error("Error assigning gate:", xhr);
      showError("Failed to assign gate");
    },
  });
}

// Unassign gate
function unassignGate() {
  const gateNumber = $("#selectedGate").val();
  const assignment = gateAssignments[gateNumber];

  if (!assignment) return;

  if (!confirm(`Remove ${assignment.flightNumber} from gate ${gateNumber}?`)) {
    return;
  }

  // Clear gate from flight
  $.ajax({
    url: `${API_URL}/flights/${assignment.flightId}`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify({ gate: "" }),
    success: function (response) {
      $("#gateModal").modal("hide");
      showSuccess(`Gate ${gateNumber} cleared successfully!`);

      // Reload
      setTimeout(function () {
        loadGatesAndFlights();
      }, 1000);
    },
    error: function (xhr) {
      console.error("Error clearing gate:", xhr);
      showError("Failed to clear gate");
    },
  });
}

// Format datetime
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Show success message
function showSuccess(message) {
  const toast = $(`
        <div class="position-fixed top-0 end-0 p-3" style="z-index: 9999">
            <div class="toast align-items-center text-white bg-success border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-check-circle me-2"></i> ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        </div>
    `);

  $("body").append(toast);
  const bsToast = new bootstrap.Toast(toast.find(".toast")[0]);
  bsToast.show();

  toast.find(".toast").on("hidden.bs.toast", function () {
    toast.remove();
  });
}

// Show error message
function showError(message) {
  const toast = $(`
        <div class="position-fixed top-0 end-0 p-3" style="z-index: 9999">
            <div class="toast align-items-center text-white bg-danger border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-exclamation-circle me-2"></i> ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        </div>
    `);

  $("body").append(toast);
  const bsToast = new bootstrap.Toast(toast.find(".toast")[0]);
  bsToast.show();

  toast.find(".toast").on("hidden.bs.toast", function () {
    toast.remove();
  });
}

// Logout
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.clear();
    window.location.href = "../auth/login.html";
  }
}
