// Configuration
const API_URL = "http://localhost:5000/api";

// Initialize on page load
$(document).ready(function () {
  loadBookingDetails();
});

// Load booking details from localStorage
function loadBookingDetails() {
  const bookingData = localStorage.getItem("lastBooking");

  if (!bookingData) {
    alert("No booking information found");
    window.location.href = "flight-search.html";
    return;
  }

  const booking = JSON.parse(bookingData);
  displayBookingDetails(booking);
  populateBoardingPass(booking);
}

// Display booking details
function displayBookingDetails(booking) {
  // Booking Reference
  $("#bookingReference").text(booking.reference);

  // Flight Details
  $("#flightNumber").text(booking.flightNumber);
  $("#originCode").text(booking.origin || "DUB");
  $("#destinationCode").text(booking.destination || "JFK");
  $("#departureTime").text(booking.departureTime || "Check itinerary");
  $("#arrivalTime").text(booking.arrivalTime || "Check itinerary");
  $("#gateNumber").text(booking.gate || "TBA");
  $("#bookingClass").text(capitalizeFirst(booking.class));
  $("#seatNumber").text(booking.seat);

  // Passenger Details
  $("#passengerName").text(booking.passenger);
  $("#passportNumber").text(booking.passportNumber || "N/A");
  $("#passengerEmail").text(booking.email || "N/A");
  $("#passengerPhone").text(booking.phone || "N/A");
}

// Capitalize first letter
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Download PDF
function downloadPDF() {
  const booking = JSON.parse(localStorage.getItem("lastBooking"));

  // Get QR code as image
  const qrCanvas = document.querySelector("#qrcode canvas");
  const qrImage = qrCanvas ? qrCanvas.toDataURL("image/png") : null;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let yPos = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138);
  doc.text("AEROFLOW AIRLINES", 105, yPos, { align: "center" });

  yPos += 10;
  doc.setFontSize(18);
  doc.text("BOARDING PASS", 105, yPos, { align: "center" });

  yPos += 15;
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);

  yPos += 15;

  // Booking Reference (Large)
  doc.setFontSize(16);
  doc.setTextColor(59, 130, 246);
  doc.text("BOOKING REFERENCE", 20, yPos);
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text(booking.reference, 20, yPos + 10);

  yPos += 25;

  // Passenger Information
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text("PASSENGER NAME", 20, yPos);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(booking.passenger, 20, yPos + 7);

  yPos += 20;

  // Flight Route (Large)
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text("FROM", 20, yPos);
  doc.text("TO", 120, yPos);

  doc.setFontSize(28);
  doc.setTextColor(30, 58, 138);
  doc.text(booking.origin, 20, yPos + 12);
  doc.text(booking.destination, 120, yPos + 12);

  // Arrow
  doc.setFontSize(20);
  doc.text("→", 90, yPos + 12);

  yPos += 30;

  // Flight Details Grid
  const details = [
    { label: "FLIGHT", value: booking.flightNumber },
    { label: "DATE", value: booking.departureTime },
    { label: "GATE", value: booking.gate || "TBA" },
    { label: "SEAT", value: booking.seat },
    { label: "CLASS", value: booking.class.toUpperCase() },
  ];

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);

  let xPos = 20;
  details.forEach((detail, index) => {
    doc.text(detail.label, xPos, yPos);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(detail.value, xPos, yPos + 7);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    xPos += 35;
  });

  yPos += 25;

  // Add QR Code if available
  if (qrImage) {
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(70, yPos, 60, 70, "FD");

    doc.addImage(qrImage, "PNG", 80, yPos + 5, 40, 40);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Scan at boarding gate", 105, yPos + 55, { align: "center" });

    yPos += 80;
  }

  // Important Notice
  doc.setDrawColor(251, 191, 36);
  doc.setFillColor(254, 243, 199);
  doc.rect(20, yPos, 170, 20, "FD");

  doc.setFontSize(10);
  doc.setTextColor(146, 64, 14);
  doc.text(
    "⚠ Please arrive at the gate 30 minutes before departure",
    105,
    yPos + 12,
    { align: "center" }
  );

  yPos += 30;

  // Contact Information
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Passenger: " + booking.passenger, 20, yPos);
  doc.text("Email: " + booking.email, 20, yPos + 5);
  doc.text("Phone: " + booking.phone, 20, yPos + 10);

  // Footer
  yPos = 280;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("AeroFlow Airlines - Thank you for flying with us", 105, yPos, {
    align: "center",
  });

  // Save PDF
  doc.save(`AeroFlow-BoardingPass-${booking.reference}.pdf`);
}

// Email booking (placeholder for now)
function emailBooking() {
  const bookingData = JSON.parse(localStorage.getItem("lastBooking"));
  const email = bookingData.email || "";

  if (!email) {
    alert(
      "No email address found in booking. Please download the PDF instead."
    );
    return;
  }

  // For now, just show a message
  // Later we can implement actual email sending via API
  alert(
    `Booking confirmation will be sent to: ${email}\n\n(Email feature coming soon! For now, please download the PDF.)`
  );
}

// Generate QR Code
function generateQRCode(bookingReference) {
  // Clear previous QR code
  $("#qrcode").empty();

  // Generate QR code with booking data
  const qrData = JSON.stringify({
    reference: bookingReference,
    timestamp: new Date().toISOString(),
    type: "boarding_pass",
  });

  // Create QR code using qrcodejs library
  new QRCode(document.getElementById("qrcode"), {
    text: qrData,
    width: 200,
    height: 200,
    colorDark: "#1e3a8a",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

// Populate boarding pass
function populateBoardingPass(booking) {
  $("#bpPassengerName").text(booking.passenger);
  $("#bpReference").text(booking.reference);
  $("#bpOrigin").text(booking.origin);
  $("#bpDestination").text(booking.destination);
  $("#bpFlightNumber").text(booking.flightNumber);

  // Format date and time
  const departureDate = new Date(booking.departureTime);
  $("#bpDate").text(
    departureDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  );
  $("#bpTime").text(
    departureDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  $("#bpGate").text(booking.gate || "TBA");
  $("#bpSeat").text(booking.seat);
  $("#bpClass").text(booking.class.toUpperCase());

  // Generate QR code
  generateQRCode(booking.reference);
}
