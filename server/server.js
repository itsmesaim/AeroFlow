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

// Test route
app.get("/api", (req, res) => {
  res.json({
    message: "Airport Management System API",
    endpoints: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      getMe: "GET /api/auth/me (Protected)",
    },
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
