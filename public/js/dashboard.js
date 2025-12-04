$(document).ready(function () {
  // Check authentication
  if (!isLoggedIn()) {
    window.location.href = "/pages/auth/login.html";
    return;
  }

  const user = getUser();

  // Check if admin
  if (user.role !== "admin") {
    alert("Access denied. Admin only.");
    logout();
    return;
  }

  // Display user info
  $("#userInfo").text(`${user.name} (${user.role})`);
  $("#adminName").text(user.name);

  // Load dashboard stats
  loadStats();
});

function loadStats() {
  // Get total flights
  $.ajax({
    url: `${API_URL}/flights`,
    method: "GET",
    success: function (response) {
      $("#totalFlights").text(response.total || 0);

      // Count by status
      const flights = response.flights || [];
      const scheduled = flights.filter((f) => f.status === "scheduled").length;
      const boarding = flights.filter((f) => f.status === "boarding").length;
      const delayed = flights.filter((f) => f.status === "delayed").length;

      $("#scheduledFlights").text(scheduled);
      $("#boardingFlights").text(boarding);
      $("#delayedFlights").text(delayed);
    },
    error: function (xhr) {
      console.error("Failed to load stats:", xhr);
    },
  });
}
