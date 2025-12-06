// Configuration
const API_URL = "http://localhost:5000/api";
let selectedFlight = null;
let aircraftConfig = null;
let occupiedSeats = [];
let selectedSeatNumber = null;
let currentPrice = 0;
let currentClass = "economy";

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
    currentClass = $(this).val();
    updateClassSelection();
    updatePrice();
    generateSeats(currentClass); // Regenerate seats for selected class
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

      // Load aircraft configuration for realistic seat layout
      if (selectedFlight.aircraft) {
        loadAircraftConfig(selectedFlight.aircraft);
      } else {
        // Fallback to basic layout if no aircraft type
        displayFlightSummary();
        loadOccupiedSeats();
      }
    },
    error: function (xhr) {
      console.error("Error loading flight:", xhr);
      alert("Failed to load flight details");
      window.location.href = "flight-search.html";
    },
  });
}

// Load aircraft configuration
function loadAircraftConfig(aircraftType) {
  $.ajax({
    url: `${API_URL}/aircraft-types/${aircraftType}`,
    method: "GET",
    success: function (response) {
      aircraftConfig = response.aircraft;
      console.log("Aircraft config loaded:", aircraftConfig);
      displayFlightSummary();
      loadOccupiedSeats();
    },
    error: function (xhr) {
      console.error("Error loading aircraft config:", xhr);
      // Fallback to basic layout
      aircraftConfig = null;
      displayFlightSummary();
      loadOccupiedSeats();
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

  // Set prices for all classes
  if (selectedFlight.price) {
    $("#economyPrice").text("$" + selectedFlight.price.economy);
    $("#businessPrice").text("$" + selectedFlight.price.business);

    // Check if first class exists (capacity > 0)
    if (
      selectedFlight.capacity &&
      selectedFlight.capacity.first > 0 &&
      selectedFlight.price.first
    ) {
      $("#firstPrice").text("$" + selectedFlight.price.first);
      $("#firstOption").show();
    } else {
      // Hide first class option if not available
      $("#firstOption").hide();
    }

    // Set initial price (economy)
    currentPrice = selectedFlight.price.economy;
    $("#totalPrice").text("$" + currentPrice);
  }

  // Mark economy as selected by default
  $("#economyOption").addClass("selected");
}

// Update class selection
function updateClassSelection() {
  $(".class-option").removeClass("selected");
  const selectedClass = $('input[name="class"]:checked').val();

  if (selectedClass === "economy") {
    $("#economyOption").addClass("selected");
  } else if (selectedClass === "business") {
    $("#businessOption").addClass("selected");
  } else if (selectedClass === "first") {
    $("#firstOption").addClass("selected");
  }

  const displayClass =
    selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1);
  if (selectedClass === "first") {
    $("#summaryClass").text("First Class");
  } else {
    $("#summaryClass").text(displayClass);
  }
}

// Update price
function updatePrice() {
  const selectedClass = $('input[name="class"]:checked').val();

  if (selectedFlight.price[selectedClass]) {
    currentPrice = selectedFlight.price[selectedClass];
    $("#totalPrice").text("$" + currentPrice);
  }
}

// Generate seat grid based on class and aircraft config
function generateSeats(travelClass = "economy") {
  const seatGrid = $("#seatGrid");
  seatGrid.empty();

  // Use aircraft config if available, otherwise use fallback
  if (aircraftConfig && aircraftConfig.seatLayout) {
    generateSeatsFromAircraftConfig(travelClass, seatGrid);
  } else {
    generateDefaultSeats(travelClass, seatGrid);
  }
}

// Generate seats using aircraft configuration
function generateSeatsFromAircraftConfig(travelClass, seatGrid) {
  const layout = aircraftConfig.seatLayout[travelClass];

  // Check if this class exists for this aircraft
  if (!layout || !layout.rows || layout.rows.length < 2) {
    seatGrid.append(`
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
        <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 15px;"></i>
        <p><strong>This class is not available on this aircraft (${aircraftConfig.name})</strong></p>
      </div>
    `);
    return;
  }

  const [startRow, endRow] = layout.rows;
  const columns = layout.columns;

  if (!columns || columns.length === 0) {
    console.error("No seat columns defined for", travelClass);
    return;
  }

  // Generate seats row by row
  for (let row = startRow; row <= endRow; row++) {
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const seatNumber = `${row}${col}`;

      // Check if seat is occupied
      const isOccupied = occupiedSeats.includes(seatNumber);

      const seatElement = $(`
        <div class="seat ${
          isOccupied ? "occupied" : "available"
        }" data-seat="${seatNumber}">
          ${seatNumber}
        </div>
      `);

      // Only allow clicking on available seats
      if (!isOccupied) {
        seatElement.on("click", function () {
          selectSeat(seatNumber);
        });
      }

      seatGrid.append(seatElement);

      // Add aisle gaps based on aircraft configuration
      // For most configurations: aisle after column B (for 2-2) or C (for 3-3)
      if (columns.length >= 6 && i === 2) {
        // 3-3 config (economy): aisle after column C
        seatGrid.append('<div style="grid-column: span 1;"></div>');
      } else if (columns.length === 4 && i === 1) {
        // 2-2 config (business/first): aisle after column B
        seatGrid.append('<div style="grid-column: span 1;"></div>');
      }
    }
  }
}

// Fallback: Generate default seats if no aircraft config
function generateDefaultSeats(travelClass, seatGrid) {
  let rows, seatsPerRow, startRow, columns;

  // Define seat layout based on class (fallback configuration)
  if (travelClass === "first") {
    rows = 2;
    seatsPerRow = 4;
    startRow = 1;
    columns = ["A", "B", "C", "D"];
  } else if (travelClass === "business") {
    rows = 6;
    seatsPerRow = 4;
    startRow = 3;
    columns = ["A", "B", "C", "D"];
  } else {
    // economy
    rows = 20;
    seatsPerRow = 6;
    startRow = 9;
    columns = ["A", "B", "C", "D", "E", "F"];
  }

  // Generate seats
  for (let row = startRow; row < startRow + rows; row++) {
    for (let col = 0; col < seatsPerRow; col++) {
      const seatNumber = `${row}${columns[col]}`;

      // Check if seat is occupied
      const isOccupied = occupiedSeats.includes(seatNumber);

      const seatElement = $(`
        <div class="seat ${
          isOccupied ? "occupied" : "available"
        }" data-seat="${seatNumber}">
          ${seatNumber}
        </div>
      `);

      // Only allow clicking on available seats
      if (!isOccupied) {
        seatElement.on("click", function () {
          selectSeat(seatNumber);
        });
      }

      seatGrid.append(seatElement);

      // Add aisle gap for economy (after seat C)
      if (travelClass === "economy" && col === 2) {
        seatGrid.append('<div style="grid-column: span 1;"></div>');
      }
      // Add aisle gap for business/first (after seat B)
      else if (
        (travelClass === "business" || travelClass === "first") &&
        col === 1
      ) {
        seatGrid.append('<div style="grid-column: span 1;"></div>');
      }
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

      // Generate seats after we know which are occupied
      generateSeats(currentClass);
    },
    error: function (xhr) {
      console.error("Error loading occupied seats:", xhr);
      // Still generate seats even if loading occupied fails
      generateSeats(currentClass);
    },
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

  // Create passenger
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
      // If passenger already exists (duplicate passport), show error
      if (
        xhr.status === 400 &&
        xhr.responseJSON?.error?.includes("already exists")
      ) {
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

// Helper function to format datetime
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
