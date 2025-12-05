// Configuration
const API_URL = "http://localhost:5000/api";
let currentBookings = [];

// Initialize on page load
$(document).ready(function () {
  // Check if there's a recent booking in localStorage
  const lastBooking = localStorage.getItem("lastBooking");
  if (lastBooking) {
    const booking = JSON.parse(lastBooking);
    if (booking.reference) {
      $("#searchInput").val(booking.reference);
      searchBookings();
    }
  } else {
    showNoBookings();
  }

  // Search form handler
  $("#searchForm").on("submit", function (e) {
    e.preventDefault();
    searchBookings();
  });
});

// Search bookings
function searchBookings() {
  const searchTerm = $("#searchInput").val().trim();

  if (!searchTerm) {
    alert("Please enter a booking reference or passport number");
    return;
  }

  showLoading();

  // Try to search by booking reference first
  $.ajax({
    url: `${API_URL}/bookings/reference/${searchTerm}`,
    method: "GET",
    success: function (response) {
      if (response.booking) {
        displayBookings([response.booking]);
      } else {
        showNoBookings();
      }
    },
    error: function (xhr) {
      // If not found by reference, try searching by passport
      searchByPassport(searchTerm);
    },
  });
}

// Search by passport number
function searchByPassport(passport) {
  // First get passenger by passport
  $.ajax({
    url: `${API_URL}/passengers/search/passport/${passport}`,
    method: "GET",
    success: function (response) {
      if (response.passenger) {
        // Then get bookings for this passenger
        getBookingsByPassenger(response.passenger._id);
      } else {
        showNoBookings();
      }
    },
    error: function (xhr) {
      console.error("Error searching:", xhr);
      showNoBookings();
    },
  });
}

// Get bookings by passenger ID
function getBookingsByPassenger(passengerId) {
  $.ajax({
    url: `${API_URL}/bookings`,
    method: "GET",
    data: { passengerId: passengerId },
    success: function (response) {
      if (response.bookings && response.bookings.length > 0) {
        displayBookings(response.bookings);
      } else {
        showNoBookings();
      }
    },
    error: function (xhr) {
      console.error("Error loading bookings:", xhr);
      showNoBookings();
    },
  });
}

// Display bookings
function displayBookings(bookings) {
  currentBookings = bookings;
  const grid = $("#bookingsGrid");
  grid.empty();

  bookings.forEach(function (booking) {
    const card = createBookingCard(booking);
    grid.append(card);
  });

  $("#loadingContainer").hide();
  $("#noBookings").hide();
  grid.fadeIn();
}

// Create booking card
function createBookingCard(booking) {
  const flight = booking.flightId;
  const passenger = booking.passengerId;

  const departureTime = formatDateTime(flight.departureTime);
  const arrivalTime = formatDateTime(flight.arrivalTime);
  const statusClass = getStatusClass(booking.status);
  const statusText = booking.status.replace("-", " ").toUpperCase();

  return `
        <div class="booking-card" data-booking-id="${booking._id}">
            <div class="booking-header">
                <div class="booking-reference">
                    <div>
                        <div class="ref-label">Booking Reference</div>
                        <div class="ref-code">${booking.bookingReference}</div>
                    </div>
                </div>
                <div class="booking-status ${statusClass}">${statusText}</div>
            </div>

            <div class="flight-route">
                <div class="route-point origin">
                    <div class="airport-code">${flight.origin}</div>
                    <div class="airport-time">${departureTime}</div>
                </div>
                <div class="route-arrow">
                    <i class="fas fa-plane"></i>
                    <i class="fas fa-arrow-right"></i>
                </div>
                <div class="route-point destination">
                    <div class="airport-code">${flight.destination}</div>
                    <div class="airport-time">${arrivalTime}</div>
                </div>
            </div>

            <div class="booking-details">
                <div class="detail-item">
                    <div class="detail-label">Flight</div>
                    <div class="detail-value">${flight.flightNumber}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Passenger</div>
                    <div class="detail-value">${passenger.name}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Seat</div>
                    <div class="detail-value">${
                      booking.seatNumber || "Not assigned"
                    }</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Class</div>
                    <div class="detail-value">${capitalizeFirst(
                      booking.class
                    )}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Gate</div>
                    <div class="detail-value">${flight.gate || "TBA"}</div>
                </div>
            </div>

            <div class="booking-actions">
                <button class="btn-action btn-view" onclick="viewBookingDetails('${
                  booking._id
                }')">
                    <i class="fas fa-eye"></i> View Details
                </button>
                ${
                  booking.status === "confirmed"
                    ? `
                    <button class="btn-action btn-edit" onclick="openEditModal('${booking._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action btn-cancel" onclick="cancelBooking('${booking._id}', '${booking.bookingReference}')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `
                    : ""
                }
            </div>
        </div>
    `;
}

// View booking details
function viewBookingDetails(bookingId) {
  const booking = currentBookings.find((b) => b._id === bookingId);
  if (!booking) return;

  const flight = booking.flightId;
  const passenger = booking.passengerId;

  // Store in localStorage and redirect to confirmation
  localStorage.setItem(
    "lastBooking",
    JSON.stringify({
      reference: booking.bookingReference,
      flightNumber: flight.flightNumber,
      origin: flight.origin,
      destination: flight.destination,
      departureTime: formatDateTime(flight.departureTime),
      arrivalTime: formatDateTime(flight.arrivalTime),
      gate: flight.gate,
      passenger: passenger.name,
      passportNumber: passenger.passportNumber,
      email: passenger.email,
      phone: passenger.phone,
      seat: booking.seatNumber,
      class: booking.class,
    })
  );

  window.location.href = "booking-confirmation.html";
}

// Open edit modal
function openEditModal(bookingId) {
  const booking = currentBookings.find((b) => b._id === bookingId);
  if (!booking) return;

  const passenger = booking.passengerId;

  $("#editBookingId").val(booking._id);
  $("#editSeat").val(booking.seatNumber);
  $("#editClass").val(booking.class);
  $("#editPassengerName").val(passenger.name);
  $("#editPassengerEmail").val(passenger.email);
  $("#editPassengerPhone").val(passenger.phone);

  $("#editModal").modal("show");
}

// Update booking
function updateBooking() {
  const bookingId = $("#editBookingId").val();
  const booking = currentBookings.find((b) => b._id === bookingId);

  if (!booking) return;

  const updatedBooking = {
    seatNumber: $("#editSeat").val().trim(),
    class: $("#editClass").val(),
  };

  const updatedPassenger = {
    name: $("#editPassengerName").val().trim(),
    email: $("#editPassengerEmail").val().trim(),
    phone: $("#editPassengerPhone").val().trim(),
  };

  // Update booking
  $.ajax({
    url: `${API_URL}/bookings/${bookingId}`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(updatedBooking),
    success: function () {
      // Update passenger
      $.ajax({
        url: `${API_URL}/passengers/${booking.passengerId._id}`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(updatedPassenger),
        success: function () {
          $("#editModal").modal("hide");
          showSuccess("Booking updated successfully!");
          searchBookings(); // Reload bookings
        },
        error: function (xhr) {
          const error = xhr.responseJSON?.error || "Failed to update passenger";
          showError(error);
        },
      });
    },
    error: function (xhr) {
      const error = xhr.responseJSON?.error || "Failed to update booking";
      showError(error);
    },
  });
}

// Cancel booking
function cancelBooking(bookingId, reference) {
  if (!confirm(`Are you sure you want to cancel booking ${reference}?`)) {
    return;
  }

  $.ajax({
    url: `${API_URL}/bookings/${bookingId}`,
    method: "DELETE",
    success: function () {
      showSuccess("Booking cancelled successfully");
      searchBookings(); // Reload bookings
    },
    error: function (xhr) {
      const error = xhr.responseJSON?.error || "Failed to cancel booking";
      showError(error);
    },
  });
}

// Helper functions
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getStatusClass(status) {
  const classes = {
    confirmed: "status-confirmed",
    "checked-in": "status-checked-in",
    boarded: "status-boarded",
    cancelled: "status-cancelled",
  };
  return classes[status] || "status-confirmed";
}

function showLoading() {
  $("#loadingContainer").show();
  $("#bookingsGrid").hide();
  $("#noBookings").hide();
}

function showNoBookings() {
  $("#loadingContainer").hide();
  $("#bookingsGrid").hide();
  $("#noBookings").fadeIn();
}

function showSuccess(message) {
  alert(message);
}

function showError(message) {
  alert("Error: " + message);
}
