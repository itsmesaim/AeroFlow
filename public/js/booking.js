// Configuration
const API_URL = "http://localhost:5000/api";
let selectedFlight = null;
let occupiedSeats = [];
let selectedSeatNumber = null;
let currentPrice = 0;

// Check if user is logged in
function checkLoginForBooking() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login to book a flight");
    // Store intended destination
    localStorage.setItem("intendedPage", "booking");
    window.location.href = "../auth/login.html";
    return false;
  }
  return true;
}

// Initialize on page load
$(document).ready(function () {
  if (!checkLoginForBooking()) {
    return;
  }
  loadFlightDetails();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Class selection
  $('input[name="class"]').on("change", function () {
    updateClassSelection();
    updatePrice();
  });

  // Form submission
  $("#bookingForm").on("submit", function (e) {
    e.preventDefault();
    submitBooking();
  });
}

// Load flight details
function loadFlightDetails() {
  const flightData = localStorage.getItem("selectedFlight");

  if (!flightData) {
    alert("No flight selected. Redirecting to search...");
    window.location.href = "flight-search.html";
    return;
  }

  const flight = JSON.parse(flightData);

  // Load full flight details via AJAX
  $.ajax({
    url: `${API_URL}/flights/${flight.id}`,
    method: "GET",
    success: function (response) {
      selectedFlight = response.flight || response;
      displayFlightSummary();
      generateSeats();
      loadOccupiedSeats();
    },
    error: function (xhr) {
      console.error("Error loading flight:", xhr);
      alert("Failed to load flight details");
      window.location.href = "flight-search.html";
    },
  });
}

// Display flight summary
function displayFlightSummary() {
  $("#summaryFlightNumber").text(selectedFlight.flightNumber);
  $("#summaryOrigin").text(selectedFlight.origin);
  $("#summaryDestination").text(selectedFlight.destination);
  $("#summaryDeparture").text(formatDateTime(selectedFlight.departureTime));
  $("#summaryArrival").text(formatDateTime(selectedFlight.arrivalTime));
  $("#summaryGate").text(selectedFlight.gate);

  // Set prices
  $("#economyPrice").text("$" + selectedFlight.price.economy);
  $("#businessPrice").text("$" + selectedFlight.price.business);

  // Set initial price
  currentPrice = selectedFlight.price.economy;
  $("#totalPrice").text("$" + currentPrice);

  // Mark economy as selected
  $("#economyOption").addClass("selected");
}

// Update class selection
function updateClassSelection() {
  $(".class-option").removeClass("selected");
  const selectedClass = $('input[name="class"]:checked').val();

  if (selectedClass === "economy") {
    $("#economyOption").addClass("selected");
  } else {
    $("#businessOption").addClass("selected");
  }

  $("#summaryClass").text(
    selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1)
  );
}

// Update price
function updatePrice() {
  const selectedClass = $('input[name="class"]:checked').val();
  currentPrice =
    selectedClass === "economy"
      ? selectedFlight.price.economy
      : selectedFlight.price.business;

  $("#totalPrice").text("$" + currentPrice);
}

// Generate seat grid
function generateSeats() {
  const seatGrid = $("#seatGrid");
  seatGrid.empty();

  const rows = 20;
  const seatsPerRow = 6;
  const columns = ["A", "B", "C", "D", "E", "F"];

  for (let row = 1; row <= rows; row++) {
    for (let col = 0; col < seatsPerRow; col++) {
      const seatNumber = `${row}${columns[col]}`;
      const seatElement = $(`
                <div class="seat available" data-seat="${seatNumber}">
                    ${seatNumber}
                </div>
            `);

      seatElement.on("click", function () {
        selectSeat(seatNumber);
      });

      seatGrid.append(seatElement);
    }
  }
}

// Load occupied seats
function loadOccupiedSeats() {
  $.ajax({
    url: `${API_URL}/bookings`,
    method: "GET",
    data: { flightId: selectedFlight._id },
    success: function (response) {
      occupiedSeats = [];

      if (response.bookings) {
        response.bookings.forEach(function (booking) {
          if (booking.seatNumber && booking.status !== "cancelled") {
            occupiedSeats.push(booking.seatNumber);
          }
        });
      }

      markOccupiedSeats();
    },
    error: function (xhr) {
      console.error("Error loading occupied seats:", xhr);
    },
  });
}

// Mark occupied seats
function markOccupiedSeats() {
  occupiedSeats.forEach(function (seatNumber) {
    $(`.seat[data-seat="${seatNumber}"]`)
      .removeClass("available")
      .addClass("occupied")
      .off("click");
  });
}

// Select seat
function selectSeat(seatNumber) {
  // Remove previous selection
  $(".seat").removeClass("selected");

  // Select new seat
  $(`.seat[data-seat="${seatNumber}"]`).addClass("selected");
  selectedSeatNumber = seatNumber;

  // Update summary
  $("#selectedSeat").val(seatNumber);
  $("#summarySeat").text(seatNumber);
}

// Submit booking
function submitBooking() {
  // Validate seat selection
  if (!selectedSeatNumber) {
    alert("Please select a seat");
    return;
  }

  // Get form data
  const passengerData = {
    name: $("#passengerName").val().trim(),
    email: $("#passengerEmail").val().trim(),
    phone: $("#passengerPhone").val().trim(),
    passportNumber: $("#passportNumber").val().trim(),
    dateOfBirth: $("#dateOfBirth").val(),
    nationality: $("#nationality").val().trim(),
  };

  const bookingClass = $('input[name="class"]:checked').val();

  const baggage = [];
  const baggageWeight = $("#baggageWeight").val();
  const baggageType = $("#baggageType").val();

  if (baggageWeight && baggageType) {
    baggage.push({
      weight: parseInt(baggageWeight),
      type: baggageType,
    });
  }

  // Show loading
  $("#loadingOverlay").fadeIn();

  // Create passenger directly (no token needed for public endpoint)
  createPassengerPublic(passengerData, bookingClass, baggage);
}

// Create passenger (public - no auth required)
function createPassengerPublic(passengerData, bookingClass, baggage) {
  $.ajax({
    url: `${API_URL}/passengers`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(passengerData),
    success: function (response) {
      createBookingPublic(response.passenger._id, bookingClass, baggage);
    },
    error: function (xhr) {
      // If passenger already exists (duplicate passport), try to get the ID from error
      if (
        xhr.status === 400 &&
        xhr.responseJSON?.error?.includes("already exists")
      ) {
        // For now, show error - we'll need to handle this better
        $("#loadingOverlay").hide();
        alert(
          "A passenger with this passport number already exists. Please use a different passport number or contact support."
        );
      } else {
        $("#loadingOverlay").hide();
        const error =
          xhr.responseJSON?.error || "Failed to create passenger record";
        alert(error);
      }
    },
  });
}

// Create booking (public - no auth required)
function createBookingPublic(passengerId, bookingClass, baggage) {
  const bookingData = {
    flightId: selectedFlight._id,
    passengerId: passengerId,
    seatNumber: selectedSeatNumber,
    class: bookingClass,
    baggage: baggage,
  };

  $.ajax({
    url: `${API_URL}/bookings`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(bookingData),
    success: function (response) {
      $("#loadingOverlay").hide();

      // Get booking and passenger details from response
      const booking = response.booking;
      const passenger = booking.passengerId;

      // Store complete booking info for confirmation page
      localStorage.setItem(
        "lastBooking",
        JSON.stringify({
          reference: booking.bookingReference,
          flightNumber: selectedFlight.flightNumber,
          origin: selectedFlight.origin,
          destination: selectedFlight.destination,
          departureTime: formatDateTime(selectedFlight.departureTime),
          arrivalTime: formatDateTime(selectedFlight.arrivalTime),
          gate: selectedFlight.gate,
          passenger: passenger.name,
          passportNumber: passenger.passportNumber,
          email: passenger.email,
          phone: passenger.phone,
          seat: selectedSeatNumber,
          class: bookingClass,
        })
      );

      // Redirect to confirmation page
      window.location.href = "booking-confirmation.html";
    },
    error: function (xhr) {
      $("#loadingOverlay").hide();
      const error = xhr.responseJSON?.error || "Failed to create booking";
      alert("Booking Error: " + error);
    },
  });
}

// Helper function to format datetime (if not already in your file)
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
