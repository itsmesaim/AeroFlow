const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (process.env.NODE_ENV === "production") {
        // Production: Use Gmail SMTP
        this.transporter = nodemailer.createTransport({
          // ← CHANGED
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        console.log("📧 Email service initialized (Gmail SMTP)");
      } else {
        // Development: Create Ethereal test account
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          // ← CHANGED
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log("📧 Email service initialized (Ethereal test account)");
        console.log("   User:", testAccount.user);
      }
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize email service:", error.message);
      this.initialized = false;
    }
  }

  async sendEmail(to, subject, html, text) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.transporter) {
      console.error("Email transporter not available");
      return null;
    }

    try {
      const info = await this.transporter.sendMail({
        from: '"AeroFlow Airlines" <noreply@aeroflow.com>',
        to,
        subject,
        html,
        text,
      });

      console.log("📧 Email sent:", info.messageId);

      // For development: Log preview URL
      if (process.env.NODE_ENV !== "production") {
        console.log("   Preview URL:", nodemailer.getTestMessageUrl(info));
      }

      return info;
    } catch (error) {
      console.error("Error sending email:", error.message);
      return null;
    }
  }

  async sendBookingConfirmation(bookingData) {
    const subject = `Booking Confirmation - ${bookingData.bookingReference}`;
    const html = this.getBookingConfirmationHTML(bookingData);
    const text = this.getBookingConfirmationText(bookingData);

    return await this.sendEmail(bookingData.email, subject, html, text);
  }

  async sendCheckinReminder(bookingData) {
    const subject = `Check-in Reminder - Flight ${bookingData.flightNumber}`;
    const html = this.getCheckinReminderHTML(bookingData);
    const text = this.getCheckinReminderText(bookingData);

    return await this.sendEmail(bookingData.email, subject, html, text);
  }

  async sendFlightStatusUpdate(bookingData, newStatus) {
    const statusMessages = {
      delayed: "has been delayed",
      cancelled: "has been cancelled",
      boarding: "is now boarding",
      departed: "has departed",
    };

    const subject = `Flight Status Update - ${bookingData.flightNumber} ${statusMessages[newStatus]}`;
    const html = this.getStatusUpdateHTML(
      bookingData,
      newStatus,
      statusMessages[newStatus]
    );
    const text = this.getStatusUpdateText(
      bookingData,
      newStatus,
      statusMessages[newStatus]
    );

    return await this.sendEmail(bookingData.email, subject, html, text);
  }

  // Email Templates
  getBookingConfirmationHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a8a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .reference { background: #10b981; color: white; padding: 15px; text-align: center; border-radius: 8px; font-size: 20px; font-weight: bold; margin: 20px 0; }
          .flight-info { background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-label { font-weight: 600; color: #64748b; }
          .detail-value { color: #1e293b; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✈️ AeroFlow Airlines</h1>
            <p>Booking Confirmation</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.passengerName},</h2>
            <p>Thank you for booking with AeroFlow Airlines! Your flight has been confirmed.</p>
            
            <div class="reference">
              Booking Reference: ${data.bookingReference}
            </div>
            
            <div class="flight-info">
              <h3 style="margin-top: 0; color: #1e3a8a;">Flight Details</h3>
              <div class="detail-row">
                <span class="detail-label">Flight Number:</span>
                <span class="detail-value">${data.flightNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Route:</span>
                <span class="detail-value">${data.origin} → ${data.destination}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Departure:</span>
                <span class="detail-value">${data.departureTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Seat:</span>
                <span class="detail-value">${data.seatNumber} (${data.class})</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Gate:</span>
                <span class="detail-value">${data.gate}</span>
              </div>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <strong>Important:</strong> Please arrive at the airport at least 2 hours before departure.
            </p>
          </div>
          
          <div class="footer">
            <p>Safe travels!</p>
            <p style="font-size: 12px; color: #94a3b8;">
              This is an automated email. Please do not reply.<br>
              For assistance, contact support@aeroflow.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getBookingConfirmationText(data) {
    return `
      AeroFlow Airlines - Booking Confirmation
      
      Hello ${data.passengerName},
      
      Your booking has been confirmed!
      
      Booking Reference: ${data.bookingReference}
      
      Flight Details:
      - Flight: ${data.flightNumber}
      - Route: ${data.origin} to ${data.destination}
      - Departure: ${data.departureTime}
      - Seat: ${data.seatNumber} (${data.class})
      - Gate: ${data.gate}
      
      Safe travels!
      AeroFlow Airlines
    `;
  }

  getCheckinReminderHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>⏰ Check-in Reminder</h1>
          </div>
          <div style="background: #fffbeb; padding: 30px; border: 1px solid #fbbf24;">
            <h2>Hello ${data.passengerName},</h2>
            <p style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px;">
              <strong>Your flight is departing soon!</strong><br>
              Flight ${data.flightNumber} departs in 24 hours.
            </p>
            <p>Booking Reference: <strong>${data.bookingReference}</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getCheckinReminderText(data) {
    return `Check-in Reminder - Flight ${data.flightNumber} departs in 24 hours. Booking: ${data.bookingReference}`;
  }

  getStatusUpdateHTML(data, newStatus, statusMessage) {
    const statusColors = {
      delayed: "#ef4444",
      cancelled: "#dc2626",
      boarding: "#10b981",
      departed: "#3b82f6",
    };

    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${statusColors[newStatus]}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>📢 Flight Status Update</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0;">
            <h2>Hello ${data.passengerName},</h2>
            <p>We have an update regarding your flight:</p>
            <p style="text-align: center; margin: 30px 0;">
              <span style="background: ${statusColors[newStatus]}; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block;">
                Flight ${data.flightNumber} ${statusMessage}
              </span>
            </p>
            <p>Booking Reference: <strong>${data.bookingReference}</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getStatusUpdateText(data, newStatus, statusMessage) {
    return `Flight ${data.flightNumber} ${statusMessage}. Booking: ${data.bookingReference}`;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
