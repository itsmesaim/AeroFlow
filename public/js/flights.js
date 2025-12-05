// Configuration
const API_URL = "http://localhost:5000/api";
let currentPage = 1;
let totalPages = 1;
let currentFilter = "all";
let searchQuery = "";
let searchTimeout = null;

// Initialize on page load
$(document).ready(function () {
  checkAuth();
  loadFlights();
  setupEventListeners();
});

// Check if user is authenticated
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

// Setup all event listeners
function setupEventListeners() {
  // Live search with debounce
  $("#searchInput").on("keyup", function () {
    clearTimeout(searchTimeout);
    searchQuery = $(this).val().trim();

    searchTimeout = setTimeout(function () {
      currentPage = 1;
      loadFlights();
    }, 500);
  });

  // Filter buttons
  $(".filter-btn").on("click", function () {
    $(".filter-btn").removeClass("active");
    $(this).addClass("active");
    currentFilter = $(this).data("status");
    currentPage = 1;
    loadFlights();
  });

  // Pagination
  $("#prevPage").on("click", function () {
    if (currentPage > 1) {
      currentPage--;
      loadFlights();
    }
  });

  $("#nextPage").on("click", function () {
    if (currentPage < totalPages) {
      currentPage++;
      loadFlights();
    }
  });
}

// Load flights with AJAX
function loadFlights() {
  showLoading();

  // Build query parameters
  let params = {
    page: currentPage,
    limit: 10,
  };

  if (searchQuery) {
    params.search = searchQuery;
  }

  if (currentFilter !== "all") {
    params.status = currentFilter;
  }

  // AJAX request
  $.ajax({
    url: `${API_URL}/flights`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    data: params,
    success: function (response) {
      // Use "flights" from your API response
      displayFlights(response.flights);

      // Build pagination object from your API response
      const pagination = {
        currentPage: response.page,
        totalPages: response.pages,
      };
      updatePagination(pagination);
    },
    error: function (xhr) {
      console.error("Error loading flights:", xhr);
      showError("Failed to load flights. Please try again.");
      showNoResults();
    },
  });
}

// Display flights in table
function displayFlights(flights) {
  const tbody = $("#flightsTableBody");
  tbody.empty();

  if (!flights || flights.length === 0) {
    showNoResults();
    return;
  }

  flights.forEach(function (flight) {
    const row = createFlightRow(flight);
    tbody.append(row);
  });

  // Add fade-in animation
  tbody.find("tr").hide().fadeIn(600);
}

// Create a table row for a flight
function createFlightRow(flight) {
  const departureTime = formatDateTime(flight.departureTime);
  const arrivalTime = formatDateTime(flight.arrivalTime);
  const statusBadge = getStatusBadge(flight.status);

  return `
        <tr data-flight-id="${flight._id}">
            <td><strong>${flight.flightNumber}</strong></td>
            <td>${flight.origin}</td>
            <td>${flight.destination}</td>
            <td>${departureTime}</td>
            <td>${arrivalTime}</td>
            <td><span class="badge bg-secondary">${flight.gate}</span></td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn btn-status" onclick="openStatusModal('${flight._id}', '${flight.flightNumber}', '${flight.status}')" title="Update Status">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button class="action-btn btn-edit" onclick="openEditModal('${flight._id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="confirmDelete('${flight._id}', '${flight.flightNumber}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

// Get status badge HTML
function getStatusBadge(status) {
  const statusClasses = {
    scheduled: "status-scheduled",
    boarding: "status-boarding",
    departed: "status-departed",
    delayed: "status-delayed",
    cancelled: "status-cancelled",
  };

  const statusClass = statusClasses[status] || "status-scheduled";
  return `<span class="status-badge ${statusClass}">${status}</span>`;
}

// Format datetime
function formatDateTime(dateString) {
  const date = new Date(dateString);
  const options = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("en-US", options);
}

// Update pagination controls
function updatePagination(pagination) {
  if (!pagination) return;

  currentPage = pagination.currentPage;
  totalPages = pagination.totalPages;

  $("#currentPage").text(currentPage);
  $("#totalPages").text(totalPages);

  // Enable/disable pagination buttons
  if (currentPage <= 1) {
    $("#prevPage").prop("disabled", true);
  } else {
    $("#prevPage").prop("disabled", false);
  }

  if (currentPage >= totalPages) {
    $("#nextPage").prop("disabled", true);
  } else {
    $("#nextPage").prop("disabled", false);
  }
}

// Show loading state
function showLoading() {
  const tbody = $("#flightsTableBody");
  tbody.html(`
        <tr>
            <td colspan="8" class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading flights...</p>
            </td>
        </tr>
    `);
}

// Show no results
function showNoResults() {
  const tbody = $("#flightsTableBody");
  tbody.html(`
        <tr>
            <td colspan="8" class="no-results">
                <i class="fas fa-search fa-3x mb-3"></i>
                <p>No flights found</p>
            </td>
        </tr>
    `);
}

// Add new flight
function addFlight() {
  // Get form values
  const flightData = {
    flightNumber: $("#flightNumber").val().trim(),
    airline: $("#aircraftType").val().trim(),
    origin: $("#origin").val().trim(),
    destination: $("#destination").val().trim(),
    departureTime: $("#departureTime").val(),
    arrivalTime: $("#arrivalTime").val(),
    gate: $("#gate").val().trim(),
    capacity: {
      economy: parseInt($("#capacity").val()),
      business: 20,
    },
    price: {
      economy: 200,
      business: 600,
    },
    aircraft: $("#aircraftType").val().trim(),
    status: $("#status").val(),
  };

  // Validate
  if (!validateFlightData(flightData)) {
    return;
  }

  // AJAX request
  $.ajax({
    url: `${API_URL}/flights`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(flightData),
    success: function (response) {
      // Close modal
      $("#addFlightModal").modal("hide");

      // Reset form
      $("#addFlightForm")[0].reset();

      // Show success message
      showSuccess("Flight added successfully!");

      // Reload flights
      loadFlights();
    },
    error: function (xhr) {
      console.error("Error adding flight:", xhr);
      const errorMsg =
        xhr.responseJSON?.error ||
        xhr.responseJSON?.message ||
        "Failed to add flight";
      showError(errorMsg);
    },
  });
}

// Open edit modal
function openEditModal(flightId) {
  // Fetch flight details via AJAX
  $.ajax({
    url: `${API_URL}/flights/${flightId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      // Your API returns the flight directly in response.flight or response
      const flight = response.flight || response;

      // Populate form
      $("#editFlightId").val(flight._id);
      $("#editFlightNumber").val(flight.flightNumber);
      $("#editAircraftType").val(flight.airline || flight.aircraft);
      $("#editOrigin").val(flight.origin);
      $("#editDestination").val(flight.destination);
      $("#editDepartureTime").val(formatDateForInput(flight.departureTime));
      $("#editArrivalTime").val(formatDateForInput(flight.arrivalTime));
      $("#editGate").val(flight.gate);
      $("#editCapacity").val(flight.capacity?.economy || 150);
      $("#editStatus").val(flight.status);

      // Show modal
      $("#editFlightModal").modal("show");
    },
    error: function (xhr) {
      console.error("Error fetching flight:", xhr);
      showError("Failed to load flight details");
    },
  });
}

// Format date for datetime-local input
function formatDateForInput(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Update flight
function updateFlight() {
  const flightId = $("#editFlightId").val();

  const flightData = {
    flightNumber: $("#editFlightNumber").val().trim(),
    airline: $("#editAircraftType").val().trim(),
    origin: $("#editOrigin").val().trim(),
    destination: $("#editDestination").val().trim(),
    departureTime: $("#editDepartureTime").val(),
    arrivalTime: $("#editArrivalTime").val(),
    gate: $("#editGate").val().trim(),
    capacity: {
      economy: parseInt($("#editCapacity").val()),
      business: 20,
    },
    price: {
      economy: 200,
      business: 600,
    },
    aircraft: $("#editAircraftType").val().trim(),
    status: $("#editStatus").val(),
  };

  // Validate
  if (!validateFlightData(flightData)) {
    return;
  }

  // AJAX request
  $.ajax({
    url: `${API_URL}/flights/${flightId}`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(flightData),
    success: function (response) {
      // Close modal
      $("#editFlightModal").modal("hide");

      // Show success message
      showSuccess("Flight updated successfully!");

      // Reload flights
      loadFlights();
    },
    error: function (xhr) {
      console.error("Error updating flight:", xhr);
      const errorMsg =
        xhr.responseJSON?.error ||
        xhr.responseJSON?.message ||
        "Failed to update flight";
      showError(errorMsg);
    },
  });
}

// Confirm delete
function confirmDelete(flightId, flightNumber) {
  if (
    confirm(
      `Are you sure you want to delete flight ${flightNumber}? This action cannot be undone.`
    )
  ) {
    deleteFlight(flightId);
  }
}

// Delete flight
function deleteFlight(flightId) {
  $.ajax({
    url: `${API_URL}/flights/${flightId}`,
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      // Animate row removal
      $(`tr[data-flight-id="${flightId}"]`).fadeOut(400, function () {
        $(this).remove();

        // Show success message
        showSuccess("Flight deleted successfully!");

        // Reload flights to update pagination
        loadFlights();
      });
    },
    error: function (xhr) {
      console.error("Error deleting flight:", xhr);
      const errorMsg =
        xhr.responseJSON?.error ||
        xhr.responseJSON?.message ||
        "Failed to delete flight";
      showError(errorMsg);
    },
  });
}

// Open status update modal
function openStatusModal(flightId, flightNumber, currentStatus) {
  $("#statusFlightId").val(flightId);
  $("#statusFlightNumber").text(flightNumber);
  $("#newStatus").val(currentStatus);
  $("#statusModal").modal("show");
}

// Update flight status
function updateStatus() {
  const flightId = $("#statusFlightId").val();
  const newStatus = $("#newStatus").val();

  $.ajax({
    url: `${API_URL}/flights/${flightId}`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify({ status: newStatus }),
    success: function (response) {
      // Close modal
      $("#statusModal").modal("hide");

      // Update the status badge in the table using DOM manipulation
      const row = $(`tr[data-flight-id="${flightId}"]`);
      const statusCell = row.find("td:nth-child(7)");
      statusCell.html(getStatusBadge(newStatus));

      // Add highlight animation
      row.addClass("table-success");
      setTimeout(function () {
        row.removeClass("table-success");
      }, 2000);

      // Show success message
      showSuccess("Flight status updated!");
    },
    error: function (xhr) {
      console.error("Error updating status:", xhr);
      const errorMsg =
        xhr.responseJSON?.error ||
        xhr.responseJSON?.message ||
        "Failed to update status";
      showError(errorMsg);
    },
  });
}

// Validate flight data
function validateFlightData(data) {
  if (
    !data.flightNumber ||
    !data.airline ||
    !data.origin ||
    !data.destination ||
    !data.departureTime ||
    !data.arrivalTime ||
    !data.gate
  ) {
    showError("Please fill in all required fields");
    return false;
  }

  if (data.capacity && data.capacity.economy < 1) {
    showError("Capacity must be at least 1");
    return false;
  }

  // Check if arrival is after departure
  const departure = new Date(data.departureTime);
  const arrival = new Date(data.arrivalTime);

  if (arrival <= departure) {
    showError("Arrival time must be after departure time");
    return false;
  }

  return true;
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

// Logout function
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    window.location.href = "../auth/login.html";
  }
}
