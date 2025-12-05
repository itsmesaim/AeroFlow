// Configuration
const API_URL = "http://localhost:5000/api";

// Initialize on page load
$(document).ready(function () {
  loadAllFlights();

  // Search form handler
  $("#searchForm").on("submit", function (e) {
    e.preventDefault();
    searchFlights();
  });
});

// Load all available flights
function loadAllFlights() {
  showLoading();

  $.ajax({
    url: `${API_URL}/flights`,
    method: "GET",
    data: {
      limit: 50,
      status: "scheduled", // Only show scheduled flights
    },
    success: function (response) {
      if (response.flights && response.flights.length > 0) {
        displayFlights(response.flights);
        updateResultsCount(response.flights.length);
      } else {
        showNoResults();
      }
    },
    error: function (xhr) {
      console.error("Error loading flights:", xhr);
      showNoResults();
    },
  });
}

// Search flights with filters
function searchFlights() {
  const origin = $("#origin").val().trim().toUpperCase();
  const destination = $("#destination").val().trim().toUpperCase();
  const date = $("#date").val();

  showLoading();

  let params = {
    limit: 50,
    status: "scheduled",
  };

  // Build search query
  let searchTerms = [];
  if (origin) searchTerms.push(origin);
  if (destination) searchTerms.push(destination);

  if (searchTerms.length > 0) {
    params.search = searchTerms.join(" ");
  }

  $.ajax({
    url: `${API_URL}/flights`,
    method: "GET",
    data: params,
    success: function (response) {
      let flights = response.flights || [];

      // Filter by date if provided
      if (date) {
        flights = flights.filter(function (flight) {
          const flightDate = new Date(flight.departureTime)
            .toISOString()
            .split("T")[0];
          return flightDate === date;
        });
      }

      // Filter by origin and destination
      if (origin) {
        flights = flights.filter((f) => f.origin.toUpperCase() === origin);
      }
      if (destination) {
        flights = flights.filter(
          (f) => f.destination.toUpperCase() === destination
        );
      }

      if (flights.length > 0) {
        displayFlights(flights);
        updateResultsCount(flights.length);
      } else {
        showNoResults();
      }
    },
    error: function (xhr) {
      console.error("Error searching flights:", xhr);
      showNoResults();
    },
  });
}

// Display flights
function displayFlights(flights) {
  const grid = $("#flightsGrid");
  grid.empty();

  flights.forEach(function (flight) {
    const card = createFlightCard(flight);
    grid.append(card);
  });

  $("#loadingContainer").hide();
  $("#noResults").hide();
  grid.fadeIn();
}

// Create flight card
function createFlightCard(flight) {
  const departureTime = formatTime(flight.departureTime);
  const arrivalTime = formatTime(flight.arrivalTime);
  const departureDate = formatDate(flight.departureTime);
  const statusClass = getStatusClass(flight.status);
  const statusText =
    flight.status.charAt(0).toUpperCase() + flight.status.slice(1);

  return `
        <div class="flight-card">
            <div class="flight-header">
                <div class="flight-number">${flight.flightNumber}</div>
                <div class="flight-status ${statusClass}">${statusText}</div>
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
            
            <div class="flight-details">
                <div class="detail-item">
                    <i class="fas fa-calendar-alt"></i>
                    <div>
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${departureDate}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-plane"></i>
                    <div>
                        <div class="detail-label">Aircraft</div>
                        <div class="detail-value">${
                          flight.aircraft || "N/A"
                        }</div>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-door-open"></i>
                    <div>
                        <div class="detail-label">Gate</div>
                        <div class="detail-value">${flight.gate}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-building"></i>
                    <div>
                        <div class="detail-label">Airline</div>
                        <div class="detail-value">${
                          flight.airline || "N/A"
                        }</div>
                    </div>
                </div>
            </div>
            
            <div class="flight-footer">
                <div class="price-info">
                    <div class="price-item">
                        <div class="price-label">Economy</div>
                        <div class="price-value">$${flight.price.economy}</div>
                    </div>
                    <div class="price-item">
                        <div class="price-label">Business</div>
                        <div class="price-value">$${flight.price.business}</div>
                    </div>
                </div>
                <button class="btn-book" onclick="bookFlight('${
                  flight._id
                }', '${flight.flightNumber}')">
                    <i class="fas fa-ticket-alt"></i> Book Now
                </button>
            </div>
        </div>
    `;
}

// Book flight - redirect to booking page
function bookFlight(flightId, flightNumber) {
  // Store flight info in localStorage
  localStorage.setItem(
    "selectedFlight",
    JSON.stringify({
      id: flightId,
      number: flightNumber,
    })
  );

  // Redirect to booking page
  window.location.href = "booking.html";
}

// Format time
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Get status class
function getStatusClass(status) {
  const classes = {
    scheduled: "status-scheduled",
    boarding: "status-boarding",
    delayed: "status-delayed",
  };
  return classes[status] || "status-scheduled";
}

// Update results count
function updateResultsCount(count) {
  $("#resultsCount").text(
    `Found ${count} available flight${count !== 1 ? "s" : ""}`
  );
}

// Show loading
function showLoading() {
  $("#loadingContainer").show();
  $("#flightsGrid").hide();
  $("#noResults").hide();
}

// Show no results
function showNoResults() {
  $("#loadingContainer").hide();
  $("#flightsGrid").hide();
  $("#noResults").fadeIn();
  $("#resultsCount").text("No flights found");
}
