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
    },
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
