const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/flights", require("./routes/flights"));
app.use("/api/passengers", require("./routes/passengers"));
app.use("/api/bookings", require("./routes/bookings"));

// Test route
app.get("/api", (req, res) => {
  res.json({
    message: "Airport Management System API",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        getMe: "GET /api/auth/me (Protected)",
      },
      flights: {
        getAll: "GET /api/flights",
        getOne: "GET /api/flights/:id",
        create: "POST /api/flights (Admin)",
        update: "PUT /api/flights/:id (Admin)",
        delete: "DELETE /api/flights/:id (Admin)",
        updateStatus: "PATCH /api/flights/:id/status (Admin/Agent)",
      },
      passengers: {
        getAll: "GET /api/passengers (Admin/Agent/Staff)",
        getOne: "GET /api/passengers/:id (Admin/Agent/Staff)",
        create: "POST /api/passengers (Admin/Agent/Staff)",
        update: "PUT /api/passengers/:id (Admin/Agent/Staff)",
        delete: "DELETE /api/passengers/:id (Admin)",
        searchByPassport:
          "GET /api/passengers/search/passport/:passportNumber (Admin/Agent/Staff)",
      },
      bookings: {
        // ADD THIS SECTION
        getAll: "GET /api/bookings (Admin/Agent/Staff)",
        getOne: "GET /api/bookings/:id (Admin/Agent/Staff)",
        getByReference:
          "GET /api/bookings/reference/:reference (Admin/Agent/Staff)",
        create: "POST /api/bookings (Admin/Agent/Staff)",
        update: "PUT /api/bookings/:id (Admin/Agent/Staff)",
        delete: "DELETE /api/bookings/:id (Admin/Agent)",
        checkIn: "PUT /api/bookings/:id/checkin (Admin/Agent/Staff)",
        board: "PUT /api/bookings/:id/board (Admin/Agent)",
      },
    },
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
