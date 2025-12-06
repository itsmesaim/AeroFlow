// Configuration
const API_URL = "http://localhost:5000/api";
let currentPage = 1;
let totalPages = 1;
let currentFilter = "all";
let searchQuery = "";
let searchTimeout = null;
let aircraftTypes = [];
let availableGates = [];

// Initialize on page load
$(document).ready(function () {
  checkAuth();
  loadAircraftTypes();
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

// Load aircraft types
function loadAircraftTypes() {
  $.ajax({
    url: `${API_URL}/aircraft-types`,
    method: "GET",
    success: function (response) {
      aircraftTypes = response.aircraftTypes;
      console.log("Aircraft types loaded:", aircraftTypes);
      populateAircraftDropdowns();
    },
    error: function (xhr) {
      console.error("Error loading aircraft types:", xhr);
      showError("Failed to load aircraft types");
    },
  });
}

// Populate aircraft dropdowns
function populateAircraftDropdowns() {
  const addSelect = $("#aircraftType");
  const editSelect = $("#editAircraftType");

  // Clear existing options
  addSelect.empty().append('<option value="">Select aircraft type...</option>');
  editSelect
    .empty()
    .append('<option value="">Select aircraft type...</option>');

  // Populate both dropdowns
  aircraftTypes.forEach(function (aircraft) {
    const option = `
      <option value="${aircraft.code}">
        ${aircraft.name} (F:${aircraft.capacity.first} B:${aircraft.capacity.business} E:${aircraft.capacity.economy})
      </option>
    `;
    addSelect.append(option);
    editSelect.append(option);
  });
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

  // Aircraft type selection in Add modal
  $("#aircraftType").on("change", function () {
    handleAircraftSelection($(this).val(), "add");
    loadAvailableGates();
  });

  // Departure time change in Add modal
  $("#departureTime").on("change", function () {
    loadAvailableGates();
  });

  // Aircraft type selection in Edit modal
  $("#editAircraftType").on("change", function () {
    handleAircraftSelection($(this).val(), "edit");
    loadAvailableGatesForEdit();
  });

  // Departure time change in Edit modal
  $("#editDepartureTime").on("change", function () {
    loadAvailableGatesForEdit();
  });
}

// Handle aircraft type selection
function handleAircraftSelection(selectedCode, mode) {
  if (!selectedCode) {
    if (mode === "add") {
      $("#capacityDisplay").hide();
      $("#priceSection").hide();
    }
    return;
  }

  const aircraft = aircraftTypes.find((a) => a.code === selectedCode);

  if (!aircraft) return;

  if (mode === "add") {
    // Show capacity info
    if (aircraft.capacity.first > 0) {
      $("#firstCapacityInfo")
        .text(`First Class: ${aircraft.capacity.first} seats`)
        .show();
      $("#firstPriceDiv").show();
      $("#firstPrice").attr(
        "placeholder",
        `Default: $${aircraft.defaultPrice.first}`
      );
    } else {
      $("#firstCapacityInfo").hide();
      $("#firstPriceDiv").hide();
    }

    $("#businessCapacityInfo").text(
      `Business Class: ${aircraft.capacity.business} seats`
    );
    $("#economyCapacityInfo").text(
      `Economy Class: ${aircraft.capacity.economy} seats`
    );

    $("#businessPrice").attr(
      "placeholder",
      `Default: $${aircraft.defaultPrice.business}`
    );
    $("#economyPrice").attr(
      "placeholder",
      `Default: $${aircraft.defaultPrice.economy}`
    );

    $("#capacityDisplay").show();
    $("#priceSection").show();
    $("#aircraftInfo").text(
      `${aircraft.name} - Total: ${
        aircraft.capacity.first +
        aircraft.capacity.business +
        aircraft.capacity.economy
      } seats`
    );
  } else {
    // Edit mode
    if (aircraft.capacity.first > 0) {
      $("#editFirstPriceDiv").show();
    } else {
      $("#editFirstPriceDiv").hide();
    }

    $("#editAircraftInfo").text(
      `${aircraft.name} - Capacity: F:${aircraft.capacity.first} B:${aircraft.capacity.business} E:${aircraft.capacity.economy}`
    );
  }
}

// Load available gates for Add modal
function loadAvailableGates() {
  const aircraftType = $("#aircraftType").val();
  const departureTime = $("#departureTime").val();

  if (!aircraftType) {
    $("#gateInfo").html(
      '<i class="fas fa-info-circle"></i> Select aircraft type first'
    );
    $("#gate").empty().append('<option value="">Select gate...</option>');
    return;
  }

  if (!departureTime) {
    $("#gateInfo").html(
      '<i class="fas fa-info-circle"></i> Select departure time to see available gates'
    );
    $("#gate").empty().append('<option value="">Select gate...</option>');
    return;
  }

  // Show loading
  $("#gateInfo").html(
    '<i class="fas fa-spinner fa-spin"></i> Loading available gates...'
  );

  $.ajax({
    url: `${API_URL}/gates/available`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    data: {
      aircraftType: aircraftType,
      dateTime: departureTime,
    },
    success: function (response) {
      availableGates = response.gates;
      populateGateDropdown(response.gates, "gate");
      const availableCount = response.gates.filter((g) => g.available).length;
      $("#gateInfo").html(
        `<i class="fas fa-check-circle text-success"></i> ${availableCount} gates available`
      );
    },
    error: function (xhr) {
      console.error("Error loading gates:", xhr);
      $("#gateInfo").html(
        '<i class="fas fa-exclamation-circle text-danger"></i> Failed to load gates'
      );
    },
  });
}

// Load available gates for Edit modal
function loadAvailableGatesForEdit() {
  const aircraftType = $("#editAircraftType").val();
  const departureTime = $("#editDepartureTime").val();

  if (!aircraftType || !departureTime) return;

  $.ajax({
    url: `${API_URL}/gates/available`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    data: {
      aircraftType: aircraftType,
      dateTime: departureTime,
    },
    success: function (response) {
      populateGateDropdown(response.gates, "editGate");
    },
    error: function (xhr) {
      console.error("Error loading gates:", xhr);
    },
  });
}

// Populate gate dropdown
function populateGateDropdown(gates, selectId) {
  const gateSelect = $(`#${selectId}`);
  gateSelect.empty().append('<option value="">Select gate...</option>');

  // Group by terminal
  const byTerminal = {};
  gates.forEach((g) => {
    if (!byTerminal[g.terminal]) byTerminal[g.terminal] = [];
    byTerminal[g.terminal].push(g);
  });

  // Add gates grouped by terminal
  Object.keys(byTerminal)
    .sort()
    .forEach((terminal) => {
      const terminalGates = byTerminal[terminal];

      // Add optgroup for terminal
      const optgroup = $(`<optgroup label="Terminal ${terminal}"></optgroup>`);

      terminalGates.forEach((gateInfo) => {
        if (gateInfo.available) {
          optgroup.append(
            `<option value="${gateInfo.gate}">${gateInfo.gate} - ${gateInfo.terminalName}</option>`
          );
        } else {
          optgroup.append(
            `<option value="${gateInfo.gate}" disabled>${gateInfo.gate} - Occupied</option>`
          );
        }
      });

      gateSelect.append(optgroup);
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
      displayFlights(response.flights);
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
            <td>${flight.aircraft || "N/A"}</td>
            <td>${flight.origin}</td>
            <td>${flight.destination}</td>
            <td>${departureTime}</td>
            <td>${arrivalTime}</td>
            <td><span class="badge bg-secondary">${
              flight.gate || "TBA"
            }</span></td>
            <td>${statusBadge}</td>
            <td>
                <button class="action-btn btn-status" onclick="openStatusModal('${
                  flight._id
                }', '${flight.flightNumber}', '${
    flight.status
  }')" title="Update Status">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button class="action-btn btn-edit" onclick="openEditModal('${
                  flight._id
                }')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="confirmDelete('${
                  flight._id
                }', '${flight.flightNumber}')" title="Delete">
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
            <td colspan="9" class="loading-spinner">
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
            <td colspan="9" class="no-results">
                <i class="fas fa-search fa-3x mb-3"></i>
                <p>No flights found</p>
            </td>
        </tr>
    `);
}

// Add new flight
function addFlight() {
  const flightData = {
    flightNumber: $("#flightNumber").val().trim().toUpperCase(),
    airline: $("#airline").val().trim(),
    aircraft: $("#aircraftType").val(),
    origin: $("#origin").val().trim().toUpperCase(),
    destination: $("#destination").val().trim().toUpperCase(),
    departureTime: $("#departureTime").val(),
    arrivalTime: $("#arrivalTime").val(),
    gate: $("#gate").val(),
    status: $("#status").val(),
  };

  // Validate aircraft type
  if (!flightData.aircraft) {
    showError("Please select an aircraft type");
    return;
  }

  // Validate gate
  if (!flightData.gate) {
    showError("Please select a gate");
    return;
  }

  // Add custom prices if provided (optional)
  const prices = {};
  if ($("#firstPrice").val()) prices.first = parseFloat($("#firstPrice").val());
  if ($("#businessPrice").val())
    prices.business = parseFloat($("#businessPrice").val());
  if ($("#economyPrice").val())
    prices.economy = parseFloat($("#economyPrice").val());

  if (Object.keys(prices).length > 0) {
    flightData.price = prices;
  }

  // Validate
  if (!validateFlightData(flightData)) {
    return;
  }

  $.ajax({
    url: `${API_URL}/flights`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(flightData),
    success: function (response) {
      $("#addFlightModal").modal("hide");
      $("#addFlightForm")[0].reset();
      $("#capacityDisplay").hide();
      $("#priceSection").hide();
      $("#gateInfo").html(
        '<i class="fas fa-info-circle"></i> Select aircraft type first'
      );
      showSuccess("Flight added successfully!");
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
  $.ajax({
    url: `${API_URL}/flights/${flightId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    success: function (response) {
      const flight = response.flight || response;

      $("#editFlightId").val(flight._id);
      $("#editFlightNumber").val(flight.flightNumber);
      $("#editAirline").val(flight.airline);
      $("#editAircraftType").val(flight.aircraft);
      $("#editOrigin").val(flight.origin);
      $("#editDestination").val(flight.destination);
      $("#editDepartureTime").val(formatDateForInput(flight.departureTime));
      $("#editArrivalTime").val(formatDateForInput(flight.arrivalTime));
      $("#editGate").val(flight.gate);
      $("#editStatus").val(flight.status);

      // Set prices
      if (flight.price) {
        if (flight.price.first && flight.price.first > 0) {
          $("#editFirstPrice").val(flight.price.first);
          $("#editFirstPriceDiv").show();
        } else {
          $("#editFirstPriceDiv").hide();
        }
        $("#editBusinessPrice").val(flight.price.business);
        $("#editEconomyPrice").val(flight.price.economy);
      }

      // Trigger aircraft change to show info
      handleAircraftSelection(flight.aircraft, "edit");

      // Load gates for edit
      loadAvailableGatesForEdit();

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
    flightNumber: $("#editFlightNumber").val().trim().toUpperCase(),
    airline: $("#editAirline").val().trim(),
    aircraft: $("#editAircraftType").val(),
    origin: $("#editOrigin").val().trim().toUpperCase(),
    destination: $("#editDestination").val().trim().toUpperCase(),
    departureTime: $("#editDepartureTime").val(),
    arrivalTime: $("#editArrivalTime").val(),
    gate: $("#editGate").val(),
    status: $("#editStatus").val(),
    price: {
      first: parseFloat($("#editFirstPrice").val()) || 0,
      business: parseFloat($("#editBusinessPrice").val()),
      economy: parseFloat($("#editEconomyPrice").val()),
    },
  };

  // Validate
  if (!validateFlightData(flightData)) {
    return;
  }

  $.ajax({
    url: `${API_URL}/flights/${flightId}`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(flightData),
    success: function (response) {
      $("#editFlightModal").modal("hide");
      showSuccess("Flight updated successfully!");
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
      $(`tr[data-flight-id="${flightId}"]`).fadeOut(400, function () {
        $(this).remove();
        showSuccess("Flight deleted successfully!");
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
      $("#statusModal").modal("hide");
      const row = $(`tr[data-flight-id="${flightId}"]`);
      const statusCell = row.find("td:nth-child(8)");
      statusCell.html(getStatusBadge(newStatus));

      row.addClass("table-success");
      setTimeout(function () {
        row.removeClass("table-success");
      }, 2000);

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
    !data.aircraft ||
    !data.origin ||
    !data.destination ||
    !data.departureTime ||
    !data.arrivalTime ||
    !data.gate
  ) {
    showError("Please fill in all required fields");
    return false;
  }

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
