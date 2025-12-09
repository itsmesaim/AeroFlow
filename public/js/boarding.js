// Configuration
const API_URL = "http://localhost:5000/api";
let currentFlightId = null;
let boardingQueue = [];

// Initialize on page load
$(document).ready(function () {
  checkAuth();
  loadFlights();
  initializeSocketUpdates();
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

// Load available flights - FIXED to load ALL flights, not just "boarding" status
function loadFlights() {
  $.ajax({
    url: `${API_URL}/flights`,
    method: "GET",
    data: {
      limit: 50,
      sortBy: "departureTime",
      order: "asc",
    },
    success: function (response) {
      console.log("Flights loaded:", response);
      const select = $("#flightSelect");
      select.empty();
      select.append('<option value="">Choose a flight...</option>');

      if (response.flights && response.flights.length > 0) {
        response.flights.forEach(function (flight) {
          select.append(`
            <option value="${flight._id}">
              ${
                flight.flightNumber
              } - ${flight.origin} to ${flight.destination} - Gate ${flight.gate || "TBA"}
            </option>
          `);
        });
      } else {
        select.append('<option value="">No flights available</option>');
      }
    },
    error: function (xhr) {
      console.error("Error loading flights:", xhr);
      showError("Failed to load flights");
    },
  });
}

// Load boarding queue
function loadBoardingQueue() {
  const flightId = $("#flightSelect").val();

  if (!flightId) {
    showEmptyState();
    return;
  }

  currentFlightId = flightId;
  showLoading();

  // Join socket room for this flight
  if (typeof joinBoardingRoom === "function") {
    joinBoardingRoom(flightId);
  }

  console.log("Loading boarding queue for flight:", flightId);

  // Load queue
  $.ajax({
    url: `${API_URL}/boarding/flight/${flightId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      console.log("Boarding queue response:", response);
      boardingQueue = response.queue || [];
      loadStatistics(flightId);
      displayBoardingQueue();
    },
    error: function (xhr) {
      console.error("Error loading boarding queue:", xhr);
      console.error("Status:", xhr.status);
      console.error("Response:", xhr.responseJSON);

      // If no queue exists yet, show empty queue instead of error
      if (xhr.status === 404 || xhr.status === 200) {
        boardingQueue = [];
        loadStatistics(flightId);
        displayBoardingQueue();
      } else {
        showError(
          "Failed to load boarding queue: " +
            (xhr.responseJSON?.error || "Unknown error")
        );
        showEmptyState();
      }
    },
  });
}

// Load statistics
function loadStatistics(flightId) {
  $.ajax({
    url: `${API_URL}/boarding/flight/${flightId}/stats`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      console.log("Stats response:", response);
      updateStatistics(response.stats);
    },
    error: function (xhr) {
      console.error("Error loading stats:", xhr);
      // Show zeros if stats fail
      updateStatistics({ waiting: 0, called: 0, boarding: 0, boarded: 0 });
    },
  });
}

// Update statistics
function updateStatistics(stats) {
  $("#waitingCount").text(stats.waiting || 0);
  $("#calledCount").text(stats.called || 0);
  $("#boardingCount").text(stats.boarding || 0);
  $("#boardedCount").text(stats.boarded || 0);
}

// Display boarding queue
function displayBoardingQueue() {
  const grid = $("#passengersGrid");
  grid.empty();

  console.log("Displaying boarding queue:", boardingQueue);

  if (boardingQueue.length === 0) {
    grid.html(`
      <div class="empty-state">
        <i class="fas fa-users-slash"></i>
        <h3>No Passengers in Queue</h3>
        <p>The boarding queue is empty. Add checked-in passengers from the check-in page.</p>
      </div>
    `);
  } else {
    boardingQueue.forEach(function (entry, index) {
      const card = createPassengerCard(entry, index + 1);
      grid.append(card);
    });
  }

  $("#loadingContainer").hide();
  $("#emptyState").hide();
  $("#statsSection").show();
  $("#boardingSection").fadeIn();
}

// Create passenger card
function createPassengerCard(entry, position) {
  const booking = entry.bookingId || {};
  const passenger = entry.passengerId || {};
  const statusClass = getStatusClass(entry.status);
  const statusText = entry.status.replace("-", " ").toUpperCase();

  let actionButtons = "";

  if (entry.status === "waiting") {
    actionButtons = `
      <button class="btn-action btn-call" onclick="callPassenger('${entry._id}')">
        <i class="fas fa-bell"></i> Call
      </button>
    `;
  } else if (entry.status === "called") {
    actionButtons = `
      <button class="btn-action btn-board" onclick="boardPassenger('${entry._id}')">
        <i class="fas fa-check"></i> Board
      </button>
    `;
  } else if (entry.status === "boarding") {
    actionButtons = `
      <button class="btn-action btn-board" onclick="markBoarded('${entry._id}')">
        <i class="fas fa-check-double"></i> Complete
      </button>
    `;
  } else if (entry.status === "boarded") {
    actionButtons = `
      <button class="btn-action btn-board" disabled style="opacity: 0.6;">
        <i class="fas fa-check-double"></i> Boarded
      </button>
    `;
  }

  return `
    <div class="passenger-card ${entry.status}" data-queue-id="${entry._id}">
      <div class="queue-position">${position}</div>
      <div class="passenger-info">
        <div class="passenger-status ${statusClass}">${statusText}</div>
        <div class="passenger-name">${passenger.name || "N/A"}</div>
        <div class="passenger-details">
          <div class="detail-badge">
            <i class="fas fa-ticket-alt"></i>
            ${booking.bookingReference || "N/A"}
          </div>
          <div class="detail-badge">
            <i class="fas fa-passport"></i>
            ${passenger.passportNumber || "N/A"}
          </div>
          <div class="detail-badge">
            <i class="fas fa-chair"></i>
            Seat ${booking.seatNumber || "N/A"}
          </div>
          <div class="detail-badge">
            <i class="fas fa-layer-group"></i>
            ${entry.boardingGroup || "general"}
          </div>
        </div>
      </div>
      <div class="passenger-actions">
        ${actionButtons}
      </div>
    </div>
  `;
}

// Call passenger
function callPassenger(queueId) {
  if (!confirm("Call this passenger for boarding?")) return;

  $.ajax({
    url: `${API_URL}/boarding/${queueId}/call`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      console.log("Passenger called:", response);
      showSuccess("Passenger called for boarding");
      loadBoardingQueue();
    },
    error: function (xhr) {
      console.error("Error calling passenger:", xhr);
      const error = xhr.responseJSON?.error || "Failed to call passenger";
      showError(error);
    },
  });
}

// Board passenger
function boardPassenger(queueId) {
  if (!confirm("Mark passenger as boarding?")) return;

  $.ajax({
    url: `${API_URL}/boarding/${queueId}/boarding`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      console.log("Passenger boarding:", response);
      showSuccess("Passenger is boarding");
      loadBoardingQueue();
    },
    error: function (xhr) {
      console.error("Error marking boarding:", xhr);
      const error = xhr.responseJSON?.error || "Failed to mark boarding";
      showError(error);
    },
  });
}

// Mark boarded
function markBoarded(queueId) {
  if (!confirm("Mark passenger as boarded?")) return;

  $.ajax({
    url: `${API_URL}/boarding/${queueId}/boarded`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      console.log("Passenger boarded:", response);
      showSuccess("Passenger boarded successfully");
      loadBoardingQueue();
    },
    error: function (xhr) {
      console.error("Error marking boarded:", xhr);
      const error = xhr.responseJSON?.error || "Failed to mark boarded";
      showError(error);
    },
  });
}

// Initialize socket updates
function initializeSocketUpdates() {
  if (typeof initSocket !== "function") {
    console.log("Socket.io not initialized");
    return;
  }

  initSocket();

  // Listen for boarding updates
  onBoardingUpdate(function (data) {
    console.log("Boarding update received:", data);

    if (currentFlightId) {
      loadBoardingQueue();
    }
  });
}

// Get status class
function getStatusClass(status) {
  const classes = {
    waiting: "status-waiting",
    called: "status-called",
    boarding: "status-boarding",
    boarded: "status-boarded",
  };
  return classes[status] || "status-waiting";
}

// Show loading
function showLoading() {
  $("#loadingContainer").show();
  $("#emptyState").hide();
  $("#statsSection").hide();
  $("#boardingSection").hide();
}

// Show empty state
function showEmptyState() {
  $("#loadingContainer").hide();
  $("#statsSection").hide();
  $("#boardingSection").hide();
  $("#emptyState").show();
}

// Show success message
function showSuccess(message) {
  // Create Bootstrap toast/alert
  const alertHtml = `
    <div class="alert alert-success alert-dismissible fade show position-fixed top-0 end-0 m-3" role="alert" style="z-index: 9999;">
      <i class="fas fa-check-circle"></i> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  $("body").append(alertHtml);
  setTimeout(() => $(".alert").alert("close"), 3000);
}

// Show error message
function showError(message) {
  // Create Bootstrap toast/alert
  const alertHtml = `
    <div class="alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3" role="alert" style="z-index: 9999;">
      <i class="fas fa-exclamation-circle"></i> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  $("body").append(alertHtml);
  setTimeout(() => $(".alert").alert("close"), 5000);
}

// Logout
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.clear();
    window.location.href = "../auth/login.html";
  }
}
