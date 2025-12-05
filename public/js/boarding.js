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

// Load available flights
function loadFlights() {
  $.ajax({
    url: `${API_URL}/flights`,
    method: "GET",
    data: {
      status: "boarding",
      limit: 50,
    },
    success: function (response) {
      const select = $("#flightSelect");
      select.empty();
      select.append('<option value="">Choose a flight...</option>');

      if (response.flights && response.flights.length > 0) {
        response.flights.forEach(function (flight) {
          select.append(`
                        <option value="${flight._id}">
                            ${flight.flightNumber} - ${flight.origin} to ${flight.destination} - Gate ${flight.gate}
                        </option>
                    `);
        });
      }
    },
    error: function (xhr) {
      console.error("Error loading flights:", xhr);
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

  // Load queue
  $.ajax({
    url: `${API_URL}/boarding/flight/${flightId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      boardingQueue = response.queue || [];
      loadStatistics(flightId);
      displayBoardingQueue();
    },
    error: function (xhr) {
      console.error("Error loading boarding queue:", xhr);
      showEmptyState();
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
      updateStatistics(response.stats);
    },
    error: function (xhr) {
      console.error("Error loading stats:", xhr);
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

  if (boardingQueue.length === 0) {
    grid.html(`
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <h3>No Passengers in Queue</h3>
                <p>The boarding queue is empty</p>
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
  const booking = entry.bookingId;
  const passenger = entry.passengerId;
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
  }

  return `
        <div class="passenger-card ${entry.status}" data-queue-id="${entry._id}">
            <div class="queue-position">${position}</div>
            <div class="passenger-info">
                <div class="passenger-status ${statusClass}">${statusText}</div>
                <div class="passenger-name">${passenger.name}</div>
                <div class="passenger-details">
                    <div class="detail-badge">
                        <i class="fas fa-ticket-alt"></i>
                        ${booking.bookingReference}
                    </div>
                    <div class="detail-badge">
                        <i class="fas fa-passport"></i>
                        ${passenger.passportNumber}
                    </div>
                    <div class="detail-badge">
                        <i class="fas fa-chair"></i>
                        Seat ${booking.seatNumber}
                    </div>
                    <div class="detail-badge">
                        <i class="fas fa-layer-group"></i>
                        ${entry.boardingGroup}
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
  $.ajax({
    url: `${API_URL}/boarding/${queueId}/call`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      showSuccess("Passenger called for boarding");
      loadBoardingQueue();
    },
    error: function (xhr) {
      const error = xhr.responseJSON?.error || "Failed to call passenger";
      showError(error);
    },
  });
}

// Board passenger
function boardPassenger(queueId) {
  $.ajax({
    url: `${API_URL}/boarding/${queueId}/boarding`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      showSuccess("Passenger is boarding");
      loadBoardingQueue();
    },
    error: function (xhr) {
      const error = xhr.responseJSON?.error || "Failed to mark boarding";
      showError(error);
    },
  });
}

// Mark boarded
function markBoarded(queueId) {
  $.ajax({
    url: `${API_URL}/boarding/${queueId}/boarded`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      showSuccess("Passenger boarded successfully");
      loadBoardingQueue();
    },
    error: function (xhr) {
      const error = xhr.responseJSON?.error || "Failed to mark boarded";
      showError(error);
    },
  });
}

// Initialize socket updates
function initializeSocketUpdates() {
  if (typeof initSocket !== "function") {
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
  alert(message);
}

// Show error message
function showError(message) {
  alert("Error: " + message);
}

// Logout
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.clear();
    window.location.href = "../auth/login.html";
  }
}
