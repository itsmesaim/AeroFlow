// Configuration
const API_URL = "http://localhost:5000/api";
let currentTab = "departures";
let allFlights = [];

// Initialize on page load
$(document).ready(function () {
  updateClock();
  setInterval(updateClock, 1000);

  loadFlights();
  setInterval(loadFlights, 30000); // Refresh every 30 seconds

  initializeSocketUpdates();
});

// Update clock
function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  $("#currentTime").text(timeString);
}

// Switch tabs
function switchTab(tab) {
  currentTab = tab;

  // Update tab buttons
  $(".tab-btn").removeClass("active");
  $(
    `.tab-btn:contains('${tab === "departures" ? "Departures" : "Arrivals"}')`
  ).addClass("active");

  // Show appropriate board
  if (tab === "departures") {
    $("#departuresBoard").show();
    $("#arrivalsBoard").hide();
  } else {
    $("#departuresBoard").hide();
    $("#arrivalsBoard").show();
  }

  displayFlights();
}

// Load flights
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
      allFlights = response.flights || [];
      displayFlights();
    },
    error: function (xhr) {
      console.error("Error loading flights:", xhr);
    },
  });
}

// Display flights
function displayFlights() {
  const now = new Date();

  // Show flights from now until 48 hours from now
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Filter upcoming flights (not past flights)
  const upcomingFlights = allFlights.filter(function (flight) {
    const flightDate = new Date(flight.departureTime);
    return flightDate >= now && flightDate <= next48Hours;
  });

  if (upcomingFlights.length === 0) {
    showNoFlights();
    return;
  }

  if (currentTab === "departures") {
    displayDepartures(upcomingFlights);
  } else {
    displayArrivals(upcomingFlights);
  }

  $("#loadingState").hide();
  $("#noFlights").hide();
}


// Display departures
function displayDepartures(flights) {
  const tbody = $("#departuresBody");
  tbody.empty();

  // Sort by departure time
  const sortedFlights = flights.sort(
    (a, b) => new Date(a.departureTime) - new Date(b.departureTime)
  );

  sortedFlights.forEach(function (flight) {
    const row = createDepartureRow(flight);
    tbody.append(row);
  });

  $("#departuresBoard").fadeIn();
}

// Display arrivals
function displayArrivals(flights) {
  const tbody = $("#arrivalsBody");
  tbody.empty();

  // Sort by arrival time
  const sortedFlights = flights.sort(
    (a, b) => new Date(a.arrivalTime) - new Date(b.arrivalTime)
  );

  sortedFlights.forEach(function (flight) {
    const row = createArrivalRow(flight);
    tbody.append(row);
  });

  $("#arrivalsBoard").fadeIn();
}

// Create departure row
function createDepartureRow(flight) {
  const time = formatTime(flight.departureTime);
  const statusBadge = getStatusBadge(flight.status);

  return `
        <tr data-flight-id="${flight._id}">
            <td class="flight-number">${flight.flightNumber}</td>
            <td class="airport-code">${flight.destination}</td>
            <td class="time-display">${time}</td>
            <td class="gate-display">${flight.gate || "TBA"}</td>
            <td>${statusBadge}</td>
        </tr>
    `;
}

// Create arrival row
function createArrivalRow(flight) {
  const time = formatTime(flight.arrivalTime);
  const statusBadge = getStatusBadge(flight.status);

  return `
        <tr data-flight-id="${flight._id}">
            <td class="flight-number">${flight.flightNumber}</td>
            <td class="airport-code">${flight.origin}</td>
            <td class="time-display">${time}</td>
            <td class="gate-display">${flight.gate || "TBA"}</td>
            <td>${statusBadge}</td>
        </tr>
    `;
}

// Get status badge
function getStatusBadge(status) {
  const statusText = status.toUpperCase();
  let statusClass = "status-scheduled";

  switch (status) {
    case "scheduled":
      statusClass = "status-scheduled";
      break;
    case "boarding":
      statusClass = "status-boarding";
      break;
    case "departed":
      statusClass = "status-departed";
      break;
    case "delayed":
      statusClass = "status-delayed";
      break;
    case "cancelled":
      statusClass = "status-cancelled";
      break;
  }

  return `<span class="status-badge ${statusClass}">${statusText}</span>`;
}

// Format time
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Show no flights
function showNoFlights() {
  $("#loadingState").hide();
  $("#departuresBoard").hide();
  $("#arrivalsBoard").hide();
  $("#noFlights").fadeIn();
}

// Initialize socket updates
function initializeSocketUpdates() {
  if (typeof initSocket !== "function") {
    console.log("Socket.io not loaded");
    return;
  }

  initSocket();

  // Listen for flight updates
  onFlightUpdate(function (data) {
    console.log("Flight updated on board:", data);

    if (data.type === "update") {
      // Find and update the specific flight row
      const flightRow = $(`tr[data-flight-id="${data.flight._id}"]`);

      if (flightRow.length) {
        // Highlight the row
        flightRow.addClass("new-flight");
        setTimeout(() => flightRow.removeClass("new-flight"), 2000);

        // Update the status badge
        const statusBadge = getStatusBadge(data.flight.status);
        flightRow.find("td:last").html(statusBadge);

        // Update gate if changed
        if (data.flight.gate) {
          flightRow.find(".gate-display").text(data.flight.gate);
        }
      } else {
        // New flight, reload all
        loadFlights();
      }
    }
  });
}
