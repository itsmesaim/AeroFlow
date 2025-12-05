// Configuration
const API_URL = "http://localhost:5000/api";

// Initialize on page load
$(document).ready(function () {
  checkAuth();
  loadUserInfo();
  loadStatistics();
});

// Check if user is authenticated and is admin
function checkAuth() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "../auth/login.html";
    return;
  }

  // Verify token and role with server
  $.ajax({
    url: `${API_URL}/auth/me`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    success: function (response) {
      if (response.success && response.data) {
        if (response.data.role !== "admin") {
          alert("Access denied. Admin only.");
          window.location.href = "../public/flight-board.html";
        }
      }
    },
    error: function (xhr) {
      console.error("Auth check failed:", xhr);
      localStorage.clear();
      window.location.href = "../auth/login.html";
    },
  });
}

// Load user information
function loadUserInfo() {
  const token = localStorage.getItem("token");

  $.ajax({
    url: `${API_URL}/auth/me`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    success: function (response) {
      if (response.success && response.data) {
        $("#userName").text(response.data.name);
      }
    },
    error: function (xhr) {
      console.error("Error loading user info:", xhr);
      if (xhr.status === 401) {
        localStorage.clear();
        window.location.href = "../auth/login.html";
      }
    },
  });
}

// Load flight statistics
function loadStatistics() {
  const token = localStorage.getItem("token");

  $.ajax({
    url: `${API_URL}/flights`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    success: function (response) {
      if (response.success && response.data) {
        calculateStatistics(response.data);

        // Hide loading, show content
        $("#loadingState").fadeOut(300, function () {
          $("#statsGrid").fadeIn(300);
          $("#quickActions").fadeIn(300);
        });
      }
    },
    error: function (xhr) {
      console.error("Error loading statistics:", xhr);
      $("#loadingState").html(`
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    Failed to load statistics. Please refresh the page.
                </div>
            `);
    },
  });
}

// Calculate and display statistics
function calculateStatistics(flights) {
  const total = flights.length;
  let scheduled = 0;
  let boarding = 0;
  let delayed = 0;
  let departed = 0;
  let cancelled = 0;

  flights.forEach(function (flight) {
    switch (flight.status) {
      case "scheduled":
        scheduled++;
        break;
      case "boarding":
        boarding++;
        break;
      case "delayed":
        delayed++;
        break;
      case "departed":
        departed++;
        break;
      case "cancelled":
        cancelled++;
        break;
    }
  });

  // Animate counter updates
  animateCounter("#totalFlights", total);
  animateCounter("#scheduledFlights", scheduled);
  animateCounter("#boardingFlights", boarding);
  animateCounter("#delayedFlights", delayed);
}

// Animate counter from 0 to target value
function animateCounter(selector, targetValue) {
  const element = $(selector);
  const duration = 1000; // 1 second
  const steps = 50;
  const stepValue = targetValue / steps;
  let currentValue = 0;

  const interval = setInterval(function () {
    currentValue += stepValue;
    if (currentValue >= targetValue) {
      currentValue = targetValue;
      clearInterval(interval);
    }
    element.text(Math.floor(currentValue));
  }, duration / steps);
}

// Logout function
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    window.location.href = "../auth/login.html";
  }
}
