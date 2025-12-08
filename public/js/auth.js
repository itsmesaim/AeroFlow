$(document).ready(function () {
  // Check if already logged in
  if (isLoggedIn()) {
    const user = getUser();
    redirectToDashboard(user.role);
    return;
  }

  // Register Form Submit
  $("#registerForm").on("submit", function (e) {
    e.preventDefault();

    const formData = {
      name: $("#name").val().trim(),
      email: $("#email").val().trim(),
      password: $("#password").val(),
      role: $('input[name="role"]:checked').val(), // ← FIXED: Get selected radio value
      phone: $("#phone").val().trim(),
      passportNumber: $("#passportNumber").val().trim(),
      dateOfBirth: $("#dateOfBirth").val(),
      nationality: $("#nationality").val().trim(),
      address: {
        street: $("#street").val().trim(),
        city: $("#city").val().trim(),
        country: $("#country").val().trim(),
      },
    };

    // Show loading
    toggleLoading("#registerBtn", true);

    // AJAX Request
    $.ajax({
      type: "POST",
      url: `${API_URL}/auth/register`,
      data: JSON.stringify(formData),
      contentType: "application/json",
      success: function (response) {
        toggleLoading("#registerBtn", false);

        if (response.success) {
          // Save token and user
          setToken(response.token);
          setUser(response.user);

          // Show success message
          showAlert("success", "Registration successful! Redirecting...");

          // Redirect after 1 second
          setTimeout(() => {
            redirectToDashboard(response.user.role);
          }, 1000);
        }
      },
      error: function (xhr) {
        toggleLoading("#registerBtn", false);
        const error =
          xhr.responseJSON?.error ||
          xhr.responseJSON?.message ||
          "Registration failed";
        showAlert("danger", error);
      },
    });
  });

  // Login Form Submit
  $("#loginForm").on("submit", function (e) {
    e.preventDefault();

    const formData = {
      email: $("#email").val().trim(),
      password: $("#password").val(),
    };

    // Show loading
    toggleLoading("#loginBtn", true);

    // AJAX Request
    $.ajax({
      type: "POST",
      url: `${API_URL}/auth/login`,
      data: JSON.stringify(formData),
      contentType: "application/json",
      success: function (response) {
        toggleLoading("#loginBtn", false);

        if (response.success) {
          // Save token and user
          setToken(response.token);
          setUser(response.user);

          // Show success message
          showAlert("success", "Login successful! Redirecting...");

          // Redirect after 1 second
          setTimeout(() => {
            // Check if user was trying to book
            const intendedPage = localStorage.getItem("intendedPage");
            if (intendedPage === "booking") {
              localStorage.removeItem("intendedPage");
              window.location.href = "/pages/passenger/booking.html";
            } else {
              redirectToDashboard(response.user.role);
            }
          }, 1000);
        }
      },
      error: function (xhr) {
        toggleLoading("#loginBtn", false);
        const error =
          xhr.responseJSON?.error ||
          xhr.responseJSON?.message ||
          "Login failed";
        showAlert("danger", error);
      },
    });
  });
});

// Helper: Show alert messages
function showAlert(type, message) {
  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <i class="fas fa-${
        type === "success" ? "check-circle" : "exclamation-circle"
      }"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  $("#alert-container").html(alertHtml);

  // Auto dismiss after 5 seconds
  setTimeout(() => {
    $(".alert").alert("close");
  }, 5000);
}

// Helper: Toggle loading state
function toggleLoading(btnSelector, isLoading) {
  const btn = $(btnSelector);
  const btnText = btn.find("span:first");
  const spinner = btn.find(".spinner-border");

  if (isLoading) {
    btn.prop("disabled", true);
    btnText.addClass("d-none");
    spinner.removeClass("d-none");
  } else {
    btn.prop("disabled", false);
    btnText.removeClass("d-none");
    spinner.addClass("d-none");
  }
}

// Helper: Redirect to appropriate dashboard
function redirectToDashboard(role) {
  console.log("Redirecting to dashboard for role:", role); // Debug log

  switch (role) {
    case "admin":
      window.location.href = "/pages/admin/dashboard.html";
      break;
    case "staff":
      window.location.href = "/pages/staff/checkin.html"; // Staff manage flights
      break;
    case "passenger":
      window.location.href = "/pages/public/flight-search.html";
      break;
    default:
      window.location.href = "/pages/public/flight-search.html";
  }
}
