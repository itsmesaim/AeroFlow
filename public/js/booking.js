// Configuration
const API_URL = "http://localhost:5000/api";
let selectedFlight = null;
let aircraftConfig = null;
let occupiedSeats = [];
let selectedSeatNumber = null;
let currentPrice = 0;
let currentClass = "economy";
let currentUser = null;
let bookingForSelf = true;

// Check if user is logged in
function checkLoginForBooking() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login to book a flight");
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

  loadUserProfile(); // Load user data first
  loadFlightDetails();
  setupEventListeners();
});

// Load user profile and auto-fill
function loadUserProfile() {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  if (userStr) {
    currentUser = JSON.parse(userStr);

    // Auto-fill form with user data
    $("#passengerName").val(currentUser.name || "");
    $("#passengerEmail").val(currentUser.email || "");

    if (currentUser.phone) $("#passengerPhone").val(currentUser.phone);
    if (currentUser.passportNumber)
      $("#passportNumber").val(currentUser.passportNumber);
    if (currentUser.dateOfBirth) {
      const dob = currentUser.dateOfBirth.split("T")[0];
      $("#dateOfBirth").val(dob);
    }
    if (currentUser.nationality) $("#nationality").val(currentUser.nationality);

    // Add "Book for someone else" toggle
    addBookingToggle();
  }
}

// Add toggle for booking for self vs someone else
function addBookingToggle() {
  const toggleHtml = `
    <div class="booking-toggle" style="margin-bottom: 20px; padding: 15px; background: #eff6ff; border-radius: 8px; border: 2px solid #3b82f6;">
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="bookForSomeoneElse" style="cursor: pointer;">
        <label class="form-check-label" for="bookForSomeoneElse" style="font-weight: 600; color: #1e3a8a; cursor: pointer;">
          <i class="fas fa-user-friends"></i> Book for someone else
        </label>
      </div>
    </div>
  `;

  $("#bookingForm").prepend(toggleHtml);

  // Toggle event
  $("#bookForSomeoneElse").on("change", function () {
    bookingForSelf = !$(this).is(":checked");

    if (bookingForSelf) {
      // Re-fill with user data
      loadUserProfile();
      $(
        "#passengerName, #passengerEmail, #passengerPhone, #passportNumber, #dateOfBirth, #nationality"
      )
        .prop("readonly", true)
        .css("background-color", "#f8fafc");
    } else {
      // Clear fields for other person
      $(
        "#passengerName, #passengerEmail, #passengerPhone, #passportNumber, #dateOfBirth, #nationality"
      )
        .val("")
        .prop("readonly", false)
        .css("background-color", "white");

      // Keep name and email if user wants
      $("#passengerName").val("");
      $("#passengerEmail").val("");
    }
  });

  // Make fields readonly initially (booking for self)
  $(
    "#passengerName, #passengerEmail, #passengerPhone, #passportNumber, #dateOfBirth, #nationality"
  )
    .prop("readonly", true)
    .css("background-color", "#f8fafc");
}

// Setup event listeners
function setupEventListeners() {
  // Class selection
  $('input[name="class"]').on("change", function () {
    currentClass = $(this).val();
    updateClassSelection();
    updatePrice();
    generateSeats(currentClass);
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

  $.ajax({
    url: `${API_URL}/flights/${flight.id}`,
    method: "GET",
    success: function (response) {
      selectedFlight = response.flight || response;

      if (selectedFlight.aircraft) {
        loadAircraftConfig(selectedFlight.aircraft);
      } else {
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

  if (selectedFlight.price) {
    $("#economyPrice").text("$" + selectedFlight.price.economy);
    $("#businessPrice").text("$" + selectedFlight.price.business);

    if (
      selectedFlight.capacity &&
      selectedFlight.capacity.first > 0 &&
      selectedFlight.price.first
    ) {
      $("#firstPrice").text("$" + selectedFlight.price.first);
      $("#firstOption").show();
    } else {
      $("#firstOption").hide();
    }

    currentPrice = selectedFlight.price.economy;
    $("#totalPrice").text("$" + currentPrice);
  }

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

  if (aircraftConfig && aircraftConfig.seatLayout) {
    generateSeatsFromAircraftConfig(travelClass, seatGrid);
  } else {
    generateDefaultSeats(travelClass, seatGrid);
  }
}

// Generate seats using aircraft configuration
function generateSeatsFromAircraftConfig(travelClass, seatGrid) {
  const layout = aircraftConfig.seatLayout[travelClass];

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

  for (let row = startRow; row <= endRow; row++) {
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const seatNumber = `${row}${col}`;
      const isOccupied = occupiedSeats.includes(seatNumber);

      const seatElement = $(`
        <div class="seat ${
          isOccupied ? "occupied" : "available"
        }" data-seat="${seatNumber}">
          ${seatNumber}
        </div>
      `);

      if (!isOccupied) {
        seatElement.on("click", function () {
          selectSeat(seatNumber);
        });
      }

      seatGrid.append(seatElement);

      if (columns.length >= 6 && i === 2) {
        seatGrid.append('<div style="grid-column: span 1;"></div>');
      } else if (columns.length === 4 && i === 1) {
        seatGrid.append('<div style="grid-column: span 1;"></div>');
      }
    }
  }
}

// Fallback: Generate default seats if no aircraft config
function generateDefaultSeats(travelClass, seatGrid) {
  let rows, seatsPerRow, startRow, columns;

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
    rows = 20;
    seatsPerRow = 6;
    startRow = 9;
    columns = ["A", "B", "C", "D", "E", "F"];
  }

  for (let row = startRow; row < startRow + rows; row++) {
    for (let col = 0; col < seatsPerRow; col++) {
      const seatNumber = `${row}${columns[col]}`;
      const isOccupied = occupiedSeats.includes(seatNumber);

      const seatElement = $(`
        <div class="seat ${
          isOccupied ? "occupied" : "available"
        }" data-seat="${seatNumber}">
          ${seatNumber}
        </div>
      `);

      if (!isOccupied) {
        seatElement.on("click", function () {
          selectSeat(seatNumber);
        });
      }

      seatGrid.append(seatElement);

      if (travelClass === "economy" && col === 2) {
        seatGrid.append('<div style="grid-column: span 1;"></div>');
      } else if (
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

      // Handle different response formats
      let bookings = response.data || response.bookings || response;

      if (Array.isArray(bookings)) {
        bookings.forEach(function (booking) {
          if (booking.seatNumber && booking.status !== "cancelled") {
            occupiedSeats.push(booking.seatNumber);
          }
        });
      }

      generateSeats(currentClass);
    },
    error: function (xhr) {
      console.error("Error loading occupied seats:", xhr);
      generateSeats(currentClass);
    },
  });
}

// Select seat
function selectSeat(seatNumber) {
  $(".seat").removeClass("selected");
  $(`.seat[data-seat="${seatNumber}"]`).addClass("selected");
  selectedSeatNumber = seatNumber;

  $("#selectedSeat").val(seatNumber);
  $("#summarySeat").text(seatNumber);
}

// Submit booking
function submitBooking() {
  if (!selectedSeatNumber) {
    alert("Please select a seat");
    return;
  }

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

  $("#loadingOverlay").fadeIn();

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
      const passenger = response.passenger || response.data || response;
      createBookingPublic(passenger._id, bookingClass, baggage, passengerData);
    },
    error: function (xhr) {
      if (
        xhr.status === 400 &&
        xhr.responseJSON?.error?.includes("already exists")
      ) {
        // Passenger exists - find them and book
        findExistingPassenger(
          passengerData.passportNumber,
          bookingClass,
          baggage,
          passengerData
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

// Find existing passenger by passport
function findExistingPassenger(
  passportNumber,
  bookingClass,
  baggage,
  passengerData
) {
  $.ajax({
    url: `${API_URL}/passengers/passport/${passportNumber}`,
    method: "GET",
    success: function (response) {
      const passenger = response.passenger || response.data || response;
      createBookingPublic(passenger._id, bookingClass, baggage, passengerData);
    },
    error: function (xhr) {
      $("#loadingOverlay").hide();
      alert("Error finding passenger. Please try again.");
    },
  });
}

// Create booking (public - no auth required)
function createBookingPublic(
  passengerId,
  bookingClass,
  baggage,
  passengerData
) {
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

      const booking = response.booking || response.data || response;

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
          passenger: passengerData.name,
          passportNumber: passengerData.passportNumber,
          email: passengerData.email,
          phone: passengerData.phone,
          seat: selectedSeatNumber,
          class: bookingClass,
        })
      );

      window.location.href = "booking-confirmation.html";
    },
    error: function (xhr) {
      $("#loadingOverlay").hide();
      const error = xhr.responseJSON?.error || "Failed to create booking";
      alert("Booking Error: " + error);
    },
  });
}

// Add toggle for booking for self vs someone else
function addBookingToggle() {
  const toggleHtml = `
    <div class="booking-toggle" style="margin-bottom: 20px; padding: 15px; background: #eff6ff; border-radius: 8px; border: 2px solid #3b82f6;">
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="bookForSomeoneElse" style="cursor: pointer; width: 50px; height: 25px;">
        <label class="form-check-label" for="bookForSomeoneElse" style="font-weight: 600; color: #1e3a8a; cursor: pointer; margin-left: 10px;">
          <i class="fas fa-user-friends"></i> Book for someone else
        </label>
      </div>
      <small style="color: #64748b; display: block; margin-top: 8px; margin-left: 60px;">
        Toggle this if you're booking on behalf of another passenger
      </small>
    </div>
  `;

  $("#bookingToggleContainer").html(toggleHtml);

  // Toggle event
  $("#bookForSomeoneElse").on("change", function () {
    bookingForSelf = !$(this).is(":checked");

    if (bookingForSelf) {
      // Re-fill with user data
      loadUserProfile();
      $(
        "#passengerName, #passengerEmail, #passengerPhone, #passportNumber, #dateOfBirth, #nationality"
      )
        .prop("readonly", true)
        .css({
          "background-color": "#f8fafc",
          "border-color": "#cbd5e1",
        });
    } else {
      // Clear fields for other person
      $(
        "#passengerName, #passengerEmail, #passengerPhone, #passportNumber, #dateOfBirth, #nationality"
      )
        .val("")
        .prop("readonly", false)
        .css({
          "background-color": "white",
          "border-color": "#e2e8f0",
        });
    }
  });

  // Make fields readonly initially (booking for self)
  $(
    "#passengerName, #passengerEmail, #passengerPhone, #passportNumber, #dateOfBirth, #nationality"
  )
    .prop("readonly", true)
    .css({
      "background-color": "#f8fafc",
      "border-color": "#cbd5e1",
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
