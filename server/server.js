const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const connectDB = require("./config/db");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Make io accessible to routes
app.set("io", io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join flight-specific room
  socket.on("join-flight", (flightId) => {
    socket.join(`flight-${flightId}`);
    console.log(`Client ${socket.id} joined flight-${flightId}`);
  });

  // Leave flight room
  socket.on("leave-flight", (flightId) => {
    socket.leave(`flight-${flightId}`);
    console.log(`Client ${socket.id} left flight-${flightId}`);
  });

  // Join boarding room (for staff)
  socket.on("join-boarding", (flightId) => {
    socket.join(`boarding-${flightId}`);
    console.log(`Staff ${socket.id} joined boarding-${flightId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/flights", require("./routes/flights"));
app.use("/api/passengers", require("./routes/passengers"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/boarding", require("./routes/boarding"));

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
      },
      passengers: {
        getAll: "GET /api/passengers (Admin/Agent/Staff)",
        getOne: "GET /api/passengers/:id",
        create: "POST /api/passengers",
        update: "PUT /api/passengers/:id",
        delete: "DELETE /api/passengers/:id (Admin)",
        searchByPassport: "GET /api/passengers/search/passport/:passportNumber",
      },
      bookings: {
        getAll: "GET /api/bookings (Admin/Agent/Staff)",
        getOne: "GET /api/bookings/:id",
        getByReference: "GET /api/bookings/reference/:reference",
        create: "POST /api/bookings",
        update: "PUT /api/bookings/:id",
        delete: "DELETE /api/bookings/:id",
        checkIn: "PUT /api/bookings/:id/checkin (Admin/Agent/Staff)",
        board: "PUT /api/bookings/:id/board (Admin/Agent)",
      },
      boarding: {
        getQueue: "GET /api/boarding/flight/:flightId (Admin/Agent)",
        getStats: "GET /api/boarding/flight/:flightId/stats (Admin/Agent)",
        addToQueue: "POST /api/boarding/queue (Admin/Agent/Staff)",
        callPassenger: "PUT /api/boarding/:id/call (Admin/Agent)",
        markBoarding: "PUT /api/boarding/:id/boarding (Admin/Agent)",
        markBoarded: "PUT /api/boarding/:id/boarded (Admin/Agent)",
        removeFromQueue: "DELETE /api/boarding/:id (Admin/Agent)",
      },
    },
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
